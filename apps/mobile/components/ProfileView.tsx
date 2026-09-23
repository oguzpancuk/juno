import type { BigThree, NatalReading, PublicChart } from '@juno/astro';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BigThreeRow } from '@/components/BigThreeRow';
import {
  ChartDetail,
  PROFILE_PRIMARY_COUNT,
  PlacementCard,
} from '@/components/ChartDetail';
import { Popup } from '@/components/Popup';
import {
  Body,
  Card,
  Chip,
  Field,
  GradientButton,
  SCREEN_PADDING,
  SectionLabel,
  useTopGap,
} from '@/components/ui';
import {
  MAX_BIO_LENGTH,
  MAX_PHOTOS,
  type PhotoSource,
  type ProfileDraft,
} from '@/lib/photos';
import {
  HEIGHT_STOPS,
  MAX_DETAIL_LENGTH,
  MAX_INTERESTS,
  heightStop,
  searchInterests,
  stopHeight,
  toggleInterest,
  type ProfileDetails,
} from '@/lib/profile-details';
import { Track } from '@/components/Track';
import { t } from '@/lib/strings';
import { color, glass, radius, space, type } from '@/theme/tokens';

/**
 * What the owner's page needs while the pill reads "Kaydet". Its presence
 * on the props — active or not — is what marks a page as the viewer's
 * own: the bio hint and the Ascendant's note are addressed to "you"
 * rather than "them". Another person's page never passes it.
 */
export interface ProfileEdit {
  /** True between "Düzenle" and "Kaydet": the strip and the input show. */
  readonly active: boolean;
  /** The draft, owned by the screen; persisted by "Kaydet", not here. */
  readonly bio: string;
  readonly onBioChange: (text: string) => void;
  /** The four optional fields as typed; persisted by "Kaydet", not here. */
  readonly details: ProfileDraft;
  /**
   * An updater, not a value: two chips pressed in one batch both read the
   * draft this render closed over, and the second write would drop the
   * first.
   */
  readonly onDetailsChange: Dispatch<SetStateAction<ProfileDraft>>;
  readonly onMove: (index: number, direction: 'left' | 'right') => void;
  readonly onRemove: (index: number) => void;
  readonly onAdd: () => void;
  /** An upload is in flight: the add tile dims and refuses a second tap. */
  readonly adding: boolean;
  /** A write is in flight (save or upload): the draft must hold still. */
  readonly busy: boolean;
}

/**
 * One profile for you and for them (owner, 2026-09-11: "kişinin profiliyle
 * kullanıcının profili tamamen aynı gözükmeli"). Presentational: the
 * photos as a paged carousel with the name inside the picture, the big
 * three, the bio, the three primary placements, and one button that opens
 * the whole chart as a popup. The screens fetch, compute the reading and
 * pass it in; nothing here reads the network or the engine.
 *
 * Three hosts: the profile tab, and — as the body of a `Popup` — the deck
 * and the chat header. Each keeps `SCREEN_PADDING` on a scroll view's
 * *content*, which is what lets the carousel below cancel it and run edge
 * to edge instead of being clipped (see the carousel's own note).
 */
export function ProfileView({
  name,
  age,
  caption,
  photos,
  sources,
  three,
  bio,
  details,
  reading,
  chart,
  photoHeight,
  fullChartLabel,
  fullChartTitle,
  edit,
}: {
  name: string;
  /** null when the date could not be read; the name then stands alone. */
  age: number | null;
  /** A line under the name on the photo — the distance, for a deck member. */
  caption?: string | undefined;
  photos: readonly string[];
  /** From `usePhotoSources(photos)`: aligned with `photos` by index. */
  sources: readonly (PhotoSource | null)[];
  three: BigThree;
  bio: string | null;
  /** Height, interests, university, occupation — any of them unanswered. */
  details: ProfileDetails;
  reading: NatalReading;
  chart: PublicChart;
  /**
   * An explicit photo height, for a host that has to line up with another
   * screen. Omitted, the carousel keeps the picture's own 3:4.
   */
  photoHeight?: number | undefined;
  /** "Tüm haritanı gör" or "Tüm haritasını gör". */
  fullChartLabel: string;
  fullChartTitle: string;
  edit?: ProfileEdit | undefined;
}) {
  const [showChart, setShowChart] = useState(false);
  const own = edit !== undefined;

  return (
    <>
      <PhotoCarousel
        photos={photos}
        sources={sources}
        name={name}
        age={age}
        caption={caption}
        height={photoHeight}
        emptyHint={own ? t.profile.noPhotos : undefined}
      />
      {edit?.active ? (
        <EditStrip photos={photos} sources={sources} edit={edit} />
      ) : null}

      <BigThreeRow three={three} />

      {edit?.active ? (
        <Card testID="bio-card">
          <TextInput
            testID="bio"
            style={styles.bioInput}
            value={edit.bio}
            onChangeText={edit.onBioChange}
            placeholder={t.profile.bioPlaceholder}
            placeholderTextColor={color.textFaint}
            multiline
            maxLength={MAX_BIO_LENGTH}
            // Typing during the save would be reverted when it lands.
            editable={!edit.busy}
          />
          <Text style={styles.hint}>{t.profile.bioHint(MAX_BIO_LENGTH)}</Text>
        </Card>
      ) : bio ? (
        <Card testID="bio-card">
          <Body>{bio}</Body>
        </Card>
      ) : own ? (
        // The owner sees where the bio would go; another person's page
        // simply has no card, an empty one saying nothing.
        <Card testID="bio-card">
          <Body muted>{t.profile.bioPlaceholder}</Body>
        </Card>
      ) : null}

      {edit?.active ? (
        <DetailsEditor edit={edit} />
      ) : (
        <DetailsCard details={details} own={own} />
      )}

      {reading.placements.slice(0, PROFILE_PRIMARY_COUNT).map((placement) => (
        <PlacementCard
          key={placement.placement}
          reading={placement}
          own={own}
          testID={`primary-${placement.placement}`}
        />
      ))}

      <GradientButton
        label={fullChartLabel}
        onPress={() => setShowChart(true)}
        testID="open-full-chart"
      />
      <Popup
        visible={showChart}
        onClose={() => setShowChart(false)}
        title={fullChartTitle}
        testID="full-chart"
      >
        <ChartDetail reading={reading} chart={chart} own={own} />
      </Popup>
    </>
  );
}

/**
 * The four optional fields as another person reads them: the height, the
 * occupation and the university as three columns across the card, the
 * interest tags in a card of their own under it (owner, 2026-09-23).
 *
 * The three keep their columns whether or not they were answered, with a
 * dash where one was not, because a row that dropped its empty fields put
 * one answer on a third of the card and left the rest blank — the labels
 * are what make the answers readable, and they only line up if they
 * always stand in the same place. The dash is only drawn once at least
 * one of the three is answered: a profile with none of them says nothing
 * here rather than showing three dashes.
 *
 * The owner, with none of them answered, gets the empty card instead, for
 * the same reason the bio has one: it is where the fields will be, and it
 * is the only thing on the page that says they exist.
 */
function DetailsCard({
  details,
  own,
}: {
  details: ProfileDetails;
  own: boolean;
}) {
  const facts: readonly {
    key: string;
    label: string;
    value: string | null;
    /** False for a column whose width is its content's; see `styles.fact`. */
    share: boolean;
  }[] = [
    {
      key: 'height',
      label: t.profile.height,
      value:
        details.height_cm === null
          ? null
          : t.profile.heightValue(details.height_cm),
      share: false,
    },
    {
      key: 'occupation',
      label: t.profile.occupation,
      value: details.occupation,
      share: true,
    },
    {
      key: 'university',
      label: t.profile.universityColumn,
      value: details.university,
      share: true,
    },
  ];
  const anyFact = facts.some((fact) => fact.value !== null);
  if (!anyFact && details.interests.length === 0) {
    return own ? (
      <Card testID="details-card">
        <Body muted>{t.profile.detailsEmpty}</Body>
      </Card>
    ) : null;
  }
  return (
    <>
      {anyFact ? (
        <Card testID="details-card">
          <View style={styles.facts}>
            {facts.map((fact) => (
              <View
                key={fact.key}
                style={[styles.fact, fact.share ? styles.factShare : null]}
                testID={`fact-${fact.key}`}
              >
                <Text style={styles.factLabel}>{fact.label}</Text>
                {/* Never onto a second line (owner, 2026-09-23: "meslek
                    ve okul asla alt satira tasmasin"). Now that the two
                    text columns have the whole card but the height's own
                    width, most values fit; one that still does not ends
                    in an ellipsis rather than wrapping. */}
                <Text
                  style={styles.factValue}
                  numberOfLines={1}
                  // The dash is a drawing, not a word: VoiceOver would
                  // read it out ("Boy, tire") where an unanswered field
                  // used to be absent from the tree altogether.
                  accessibilityLabel={
                    fact.value === null
                      ? t.profile.detailMissingLabel
                      : undefined
                  }
                >
                  {fact.value ?? t.profile.detailMissing}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      {details.interests.length > 0 ? (
        <Card testID="interests-card">
          <View style={styles.tags} testID="interest-tags">
            {details.interests.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>
                  {t.profile.interestNames[tag]}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </>
  );
}

/**
 * The same four in the edit mode: a drag for the height with one chip
 * that clears it, a line each for the university and the occupation, and
 * the tag list as chips.
 *
 * The height is a drag rather than a number pad, like the radius and the
 * age in the discovery sheet (owner, 2026-09-15: "daha kolay seçilmeli"),
 * and it starts at the middle of the range rather than at 120 cm, so the
 * first touch does not read as a claim the person did not make.
 */
const HEIGHT_DEFAULT = 170;

function DetailsEditor({ edit }: { edit: ProfileEdit }) {
  const draft = edit.details;
  const set = (patch: Partial<ProfileDraft>) =>
    edit.onDetailsChange((prev) => ({ ...prev, ...patch }));
  // What a drag in progress shows above the track; null when no finger is
  // down, and the draft is then what the label reads.
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? draft.heightCm ?? HEIGHT_DEFAULT;
  const full = draft.interests.length >= MAX_INTERESTS;
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const found = searchInterests(query, (tag) => t.profile.interestNames[tag]);

  return (
    <Card testID="details-editor">
      <SectionLabel>{t.profile.details}</SectionLabel>

      <View style={styles.detailRow}>
        <Text style={styles.factLabel}>{t.profile.height}</Text>
        <Text style={styles.factValue} testID="height-value">
          {draft.heightCm === null && drag === null
            ? t.profile.heightAny
            : t.profile.heightValue(shown)}
        </Text>
      </View>
      <Track
        testID="height"
        count={HEIGHT_STOPS}
        values={[heightStop(shown)]}
        disabled={edit.busy}
        labels={[t.profile.height]}
        describe={(stop) => t.profile.heightValue(stopHeight(stop))}
        onChange={(values) => setDrag(stopHeight(values[0]))}
        onCommit={(values) => {
          setDrag(null);
          set({ heightCm: stopHeight(values[0]) });
        }}
        onCancel={() => {
          // A gesture that ends on the stop it began from reports a
          // cancel, not a commit — so with the thumb parked on the
          // unanswered default, tapping it where it already sits is the
          // one gesture in the range that would answer nothing, and
          // 170 cm the one height this control could not record.
          //
          // So the cancel answers the field with what the track is
          // showing, rather than with the drag alone: a tap on the
          // occupied stop reports no `onChange` either — `place` returns
          // early when the stop has not moved — so `drag` is still null
          // here and it is `shown` that holds the value.
          //
          // Safe because a scroll never arrives: `Track`'s `finish`
          // returns before `onCancel` when no drag was begun, and a
          // touch the track read as the page's scroll begins none. When
          // a height is already stored and the tap lands on it, this
          // rewrites the same value.
          set({ heightCm: shown });
          setDrag(null);
        }}
      />
      <Chip
        testID="height-any"
        label={t.profile.heightAny}
        selected={draft.heightCm === null}
        disabled={edit.busy}
        style={styles.clearChip}
        onPress={() => set({ heightCm: null })}
      />

      <Text style={[styles.factLabel, styles.detailSpacer]}>
        {t.profile.occupation}
      </Text>
      {/* No placeholder, by the owner's word (2026-09-23: "kendimiz
          çizmeyelim, placeholder textleri kaldıralım") — on iOS with the
          new architecture a placeholder is drawn with a gap between every
          letter, at random (facebook/react-native#42589), and the label
          above each field already says what it is. The label is a
          sibling, not a programmatic one, so a screen reader would be
          left with an unnamed box; `accessibilityLabel` is what the
          placeholder used to give it. */}
      <Field
        testID="occupation"
        value={draft.occupation}
        onChangeText={(text) => set({ occupation: text })}
        accessibilityLabel={t.profile.occupation}
        maxLength={MAX_DETAIL_LENGTH}
        editable={!edit.busy}
      />

      <Text style={[styles.factLabel, styles.detailSpacer]}>
        {t.profile.university}
      </Text>
      <Field
        testID="university"
        value={draft.university}
        onChangeText={(text) => set({ university: text })}
        accessibilityLabel={t.profile.university}
        maxLength={MAX_DETAIL_LENGTH}
        editable={!edit.busy}
      />

      <Text style={[styles.factLabel, styles.detailSpacer]}>
        {t.profile.interests}
      </Text>
      {/* What is picked, and nothing else (owner, 2026-09-23: "boşken
          hiçbir şey gözükmesin ama tıklanınca bir popup açılsın, orada
          hepsi gözüksün"). The thirty-six chips that used to stand here
          were most of the edit page. The box itself stays when nothing is
          picked — drawn like the two fields above it, and empty — because
          it is the only way to open the picker.

          The tags inside are the read-only ones the profile draws, not
          chips: the whole box is one target, and a chip inside it would
          promise a tap of its own that removes it. */}
      <Pressable
        testID="interest-open"
        accessibilityRole="button"
        accessibilityLabel={t.profile.interestsChoose}
        accessibilityValue={{
          text:
            draft.interests.length === 0
              ? t.profile.interestsNone
              : draft.interests
                  .map((tag) => t.profile.interestNames[tag])
                  .join(', '),
        }}
        accessibilityState={{ disabled: edit.busy }}
        disabled={edit.busy}
        onPress={() => setPicking(true)}
        style={({ pressed }) => [
          styles.interestBox,
          (pressed || edit.busy) && styles.dim,
        ]}
      >
        <View style={styles.tags}>
          {draft.interests.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{t.profile.interestNames[tag]}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      {/* The list and the search both live in the sheet. `contentKey` is
          the query, so a new search is read from its first result rather
          than from wherever the last one was left scrolled. */}
      <Popup
        visible={picking}
        onClose={() => {
          setPicking(false);
          setQuery('');
        }}
        title={t.profile.interests}
        contentKey={query}
        testID="interest-picker"
      >
        <View style={styles.searchField}>
          <Text style={styles.factLabel}>{t.profile.interestSearch}</Text>
          <Field
            testID="interest-search"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel={t.profile.interestSearch}
            autoCorrect={false}
            autoCapitalize="none"
            editable={!edit.busy}
          />
        </View>
        <Text style={styles.hint}>
          {full
            ? t.profile.interestsFull(MAX_INTERESTS)
            : t.profile.interestsHint(MAX_INTERESTS)}
        </Text>
        {found.length === 0 ? (
          <Body muted>{t.profile.interestSearchEmpty}</Body>
        ) : (
          <View style={styles.tags} testID="interest-options">
            {found.map((tag) => {
              const on = draft.interests.includes(tag);
              return (
                <Chip
                  key={tag}
                  testID={`interest-${tag}`}
                  label={t.profile.interestNames[tag]}
                  selected={on}
                  // At the cap the unpicked ones stop answering, which is
                  // what the hint above them says. The picked ones still
                  // do, so the list is never stuck.
                  disabled={edit.busy || (full && !on)}
                  onPress={() =>
                    set({ interests: toggleInterest(draft.interests, tag) })
                  }
                />
              );
            })}
          </View>
        )}
      </Popup>
    </Card>
  );
}

/** The photo's shape on every page, the same as the picker's crop. */
const PHOTO_ASPECT = 3 / 4;

/**
 * One page per photo, the name inside the picture on a scrim — the
 * discover card's pattern, so a person looks the same on the deck and on
 * their page. The scrim is one overlay over the whole strip rather than a
 * copy per page: the name does not move while the photos do.
 */
function PhotoCarousel({
  photos,
  sources,
  name,
  age,
  caption,
  height: fixedHeight,
  emptyHint,
}: {
  photos: readonly string[];
  sources: readonly (PhotoSource | null)[];
  name: string;
  age: number | null;
  caption: string | undefined;
  /** Set by a host that must line up with another screen. */
  height: number | undefined;
  /** What the owner reads in place of a photo; nothing for another person. */
  emptyHint: string | undefined;
}) {
  // What this host owes the top edge. See the `carousel` style below.
  const topGap = useTopGap();
  // Measured, not taken from the window: the page is as wide as whatever
  // the screen's padding leaves, and the carousel should not know that.
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const height = fixedHeight ?? Math.round(width / PHOTO_ASPECT);
  // A photo removed or moved while its page was showing must not leave
  // the dots pointing past the end.
  const current = Math.min(page, Math.max(0, photos.length - 1));
  return (
    <View
      style={[styles.carousel, { marginTop: -topGap }]}
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
      testID="photo-carousel"
    >
      {width === 0 ? null : photos.length === 0 ? (
        <View style={[styles.pageEmpty, { width, height }]}>
          {emptyHint === undefined ? null : (
            <Text style={styles.emptyHint}>{emptyHint}</Text>
          )}
        </View>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) =>
            setPage(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          testID="photo-pages"
        >
          {photos.map((path, index) => {
            const source = sources[index] ?? null;
            return source ? (
              <Image
                key={path}
                source={source}
                style={{ width, height }}
                resizeMode="cover"
                testID={`photo-${index}`}
              />
            ) : (
              <View key={path} style={[styles.pageEmpty, { width, height }]} />
            );
          })}
        </ScrollView>
      )}
      <LinearGradient
        colors={['transparent', color.scrim, color.bg]}
        style={styles.scrim}
      >
        {photos.length > 1 ? (
          <View style={styles.dots} testID="photo-dots">
            {photos.map((path, index) => (
              <View
                key={path}
                style={[styles.dot, index === current && styles.dotOn]}
              />
            ))}
          </View>
        ) : null}
        <Text style={styles.name} testID="profile-name">
          {age === null ? name : `${name}, ${age}`}
        </Text>
        {/* Always drawn, even with nothing to say: the deck's card always
            has a distance line here, and the two are supposed to be the
            same card (owner, 2026-09-14). An empty line keeps the name on
            the same y rather than letting it drop 22pt on the one screen
            that has no caption. */}
        <Text style={styles.caption}>{caption ?? ''}</Text>
      </LinearGradient>
    </View>
  );
}

/**
 * The edit mode's photo controls: a thumbnail per photo with ‹ › and
 * Kaldır, and a tile that adds one. Buttons, not a drag — six items at
 * most and no gesture dependency (owner default, 2026-09-11). Moving is
 * a draft until "Kaydet"; adding and removing write at once, because the
 * trigger on `profiles.photos` needs the object to exist in storage
 * before the profile may list it.
 */
function EditStrip({
  photos,
  sources,
  edit,
}: {
  photos: readonly string[];
  sources: readonly (PhotoSource | null)[];
  edit: ProfileEdit;
}) {
  const last = photos.length - 1;
  return (
    <View style={styles.strip} testID="photo-strip">
      <Text style={styles.hint}>{t.profile.photosHint(MAX_PHOTOS)}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripRow}
      >
        {photos.map((path, index) => {
          const source = sources[index] ?? null;
          return (
            <View key={path} style={styles.tile} testID={`photo-tile-${index}`}>
              {source ? (
                <Image
                  source={source}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={styles.tileRow}>
                <Arrow
                  glyph="‹"
                  label={t.profile.moveLeft}
                  disabled={index === 0}
                  onPress={() => edit.onMove(index, 'left')}
                  testID={`move-left-${index}`}
                />
                <Pressable
                  testID={`remove-photo-${index}`}
                  accessibilityRole="button"
                  hitSlop={6}
                  onPress={() => edit.onRemove(index)}
                  style={({ pressed }) => pressed && styles.dim}
                >
                  <Text style={styles.removeText}>{t.profile.remove}</Text>
                </Pressable>
                <Arrow
                  glyph="›"
                  label={t.profile.moveRight}
                  disabled={index === last}
                  onPress={() => edit.onMove(index, 'right')}
                  testID={`move-right-${index}`}
                />
              </View>
            </View>
          );
        })}
        {photos.length < MAX_PHOTOS ? (
          <Pressable
            testID="add-photo"
            accessibilityRole="button"
            disabled={edit.adding}
            onPress={edit.onAdd}
            style={({ pressed }) => [
              styles.tile,
              styles.addTile,
              (pressed || edit.adding) && styles.dim,
            ]}
          >
            <Text style={styles.addGlyph}>+</Text>
            <Text style={styles.addText}>
              {edit.adding ? t.profile.adding : t.profile.addPhoto}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Arrow({
  glyph,
  label,
  disabled,
  onPress,
  testID,
}: {
  glyph: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.arrow,
        disabled && styles.arrowOff,
        pressed && styles.dim,
      ]}
    >
      <Text style={styles.arrowText}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Edge to edge on all four sides that meet the frame (owner,
  // 2026-09-12 sideways, 2026-09-14 up). The photo cancels the gutter and
  // the top gap with negative margins, and loses its corner radius with
  // them — a rounded corner against the screen edge reads as a mistake.
  //
  // Two things the host owes for that to work. It must keep
  // `SCREEN_PADDING` on a scroll view's *content*, as `Screen` and
  // `Popup` both do, so the negative margin grows into the frame rather
  // than out of it, where a scroll view would clip it. And it must
  // publish its top padding through `useTopGap` — the clearance on a bleed `Screen`,
  // 0 in a bleed `Popup`, which gives its own up at the sheet because
  // there the gap sits above the scroll view and nothing inside can reach
  // it. The carousel must also be the host's first in-flow child, which
  // is why the profile tab's controls left the flow.
  carousel: {
    alignSelf: 'stretch',
    marginHorizontal: -SCREEN_PADDING,
    overflow: 'hidden',
    backgroundColor: color.surfaceHigh,
  },
  pageEmpty: {
    backgroundColor: color.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  emptyHint: {
    ...type.body,
    color: color.textMuted,
    textAlign: 'center',
    // Above the scrim's own text, which sits at the bottom of the page.
    marginBottom: space.xxl,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // The gutter the carousel cancelled: the name lines up with the cards.
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space.xxl,
    paddingBottom: space.md,
    gap: 2,
    // Swipes go to the pages underneath; the scrim only paints.
    pointerEvents: 'none',
  },
  dots: {
    flexDirection: 'row',
    gap: space.xs,
    marginBottom: space.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.track,
  },
  dotOn: { backgroundColor: color.text },
  name: { ...type.title, color: color.text },
  caption: { ...type.bodySmall, color: color.textMuted },
  strip: { gap: space.sm },
  stripRow: { gap: space.md, paddingVertical: space.xs },
  tile: { width: 84, gap: space.xs },
  thumb: { width: 84, height: 112, borderRadius: radius.md },
  thumbEmpty: { backgroundColor: color.surfaceHigh },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { opacity: 0.3 },
  arrowText: { fontSize: 18, lineHeight: 22, color: color.text },
  removeText: { ...type.caption, color: color.textMuted },
  addTile: {
    height: 112,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
  },
  addGlyph: { fontSize: 26, color: color.cool },
  addText: { ...type.caption, color: color.textMuted, textAlign: 'center' },
  dim: { opacity: 0.6 },
  hint: { ...type.caption, color: color.textFaint },
  // The answered facts on one wrapping row: a label over its value, the
  // way the match page sets a number under its word.
  facts: { flexDirection: 'row', gap: space.md },
  // A column takes the width of its content unless it is told to share
  // (owner, 2026-09-23: "boy hep belli bir alan kaplayacak. kalan 2 alani
  // da kalan alana esit bolusturelim"). Height is the one that does not:
  // "168 cm" is as wide as it will ever be, and measuring it rather than
  // fixing a width in points keeps it right at every text size.
  fact: { flexGrow: 0, flexShrink: 0, gap: 2 },
  // The other two split what is left, equally whatever is in them:
  // `flexBasis` 0 so a long occupation cannot take room from the school,
  // `minWidth` 0 so a value clips inside its column instead of running
  // out past the card, which has no `overflow: 'hidden'` to stop it.
  factShare: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  factLabel: { ...type.label, color: color.textFaint },
  factValue: { ...type.body, color: color.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // A tag, not a chip: nothing here takes a touch, so it must not look
  // like the chips one row up in the edit mode.
  tag: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceSoft,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  tagText: { ...type.bodySmall, color: color.text },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  detailSpacer: { marginTop: space.lg },
  // Drawn like the two fields above it, so the three answers on this card
  // read as three inputs. `minHeight` is about one field's height: with
  // nothing picked the box has no content at all, and without a floor it
  // would collapse to a line nobody would aim a thumb at.
  interestBox: {
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.edge,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: 55,
    justifyContent: 'center',
  },
  // The sheet's own gap is `space.md`, which would set the label adrift
  // from the box it names.
  searchField: { gap: space.xs },
  // Alone on its row, so it does not stretch across the card.
  clearChip: { alignSelf: 'flex-start', marginTop: space.sm },
  bioInput: {
    ...type.body,
    color: color.text,
    minHeight: 96,
    textAlignVertical: 'top',
    padding: 0,
  },
});

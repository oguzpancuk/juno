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
import { DetailIcon, type DetailIconName } from '@/components/DetailIcon';
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
  shortSchool,
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
        details={details}
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
 * The facts that sit under the name, each with the glyph that says which
 * fact it is (owner, 2026-09-23: "su sekilde ismin hemen altinda olsun.
 * taglerle degil sembollerle gosterelim"). Unanswered ones are simply
 * absent: with no column to hold open there is nothing for a dash to
 * stand in for, which is the trade he took when he picked this shape over
 * the labelled columns it replaces.
 *
 * The `label` never reaches the screen. It is what a screen reader hears
 * in the glyph's place, because a picture of a mortarboard says nothing
 * to it and "Boğaziçi Ü." alone does not say it is a school. `spoken` is
 * the rest of that label: the value, except for the school, where it is
 * the name as it was typed.
 */
interface FactRow {
  readonly key: DetailIconName;
  readonly label: string;
  readonly value: string;
  /**
   * What a screen reader says in place of `value`. They differ for the
   * school: `shortSchool` exists because a line has a width and
   * "Üniversitesi" spends most of it, and speech has no width — "Ü." is
   * read out as a letter and a period.
   */
  readonly spoken: string;
}

function factRows(details: ProfileDetails): readonly FactRow[] {
  const height =
    details.height_cm === null
      ? null
      : t.profile.heightValue(details.height_cm);
  const rows: readonly {
    key: DetailIconName;
    label: string;
    value: string | null;
    spoken: string | null;
  }[] = [
    {
      key: 'height' as const,
      label: t.profile.height,
      value: height,
      spoken: height,
    },
    {
      key: 'occupation' as const,
      label: t.profile.occupation,
      value: details.occupation,
      spoken: details.occupation,
    },
    {
      key: 'university' as const,
      label: t.profile.universityColumn,
      // Short here as on the deck (owner, 2026-09-23: "profilde de
      // kisaltalim"): "Üniversitesi" is most of what a school name spends
      // a line on while saying nothing about which school it is. The
      // editor still holds the name as it was typed; this is the drawing,
      // and `spoken` is the one reader the width argument does not apply
      // to.
      value:
        details.university === null ? null : shortSchool(details.university),
      spoken: details.university,
    },
  ];
  return rows.filter((row): row is FactRow => row.value !== null);
}

/** The rows themselves, for a host that has somewhere to put them. */
function FactRows({ details }: { details: ProfileDetails }) {
  const rows = factRows(details);
  if (rows.length === 0) return null;
  return (
    <View style={styles.factRows} testID="profile-facts">
      {rows.map((row) => (
        <View key={row.key} style={styles.factRow} testID={`fact-${row.key}`}>
          <DetailIcon name={row.key} />
          {/* Never onto a second line (owner, 2026-09-23: "meslek ve okul
              asla alt satira tasmasin"). A row has the whole width now, so
              only a very long occupation reaches the end of one. */}
          <Text
            style={styles.factRowText}
            numberOfLines={1}
            accessibilityLabel={`${row.label}: ${row.spoken}`}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * The interest tags in a card of their own, and — for an owner who has
 * answered none of the four — the one line on the page that says the
 * fields exist at all.
 *
 * The three other facts left this card for the rows under the name, but
 * the empty state did not go with them: its sentence names all four, and
 * it is still true in the only state that draws it. So the guard keeps
 * both halves. Dropping the facts half would put "Boy, ilgi alanların,
 * üniversite ve meslek isteğe bağlı" under the rows that already draw
 * three of those four, which is the card calling answered fields empty.
 *
 * An owner who answered his facts but no tags gets no card, as before:
 * nothing on the page is missing a word for it, and the tags are one tap
 * away in the editor.
 */
function DetailsCard({
  details,
  own,
}: {
  details: ProfileDetails;
  own: boolean;
}) {
  if (details.interests.length === 0) {
    return own && factRows(details).length === 0 ? (
      <Card testID="details-card">
        <Body muted>{t.profile.detailsEmpty}</Body>
      </Card>
    ) : null;
  }
  return (
    <Card testID="interests-card">
      <View style={styles.tags} testID="interest-tags">
        {details.interests.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{t.profile.interestNames[tag]}</Text>
          </View>
        ))}
      </View>
    </Card>
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
  details,
  height: fixedHeight,
  emptyHint,
}: {
  photos: readonly string[];
  sources: readonly (PhotoSource | null)[];
  name: string;
  age: number | null;
  caption: string | undefined;
  /** Drawn under the name as iconed rows; nothing drawn for the unanswered. */
  details: ProfileDetails;
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
        <FactRows details={details} />
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
  // The answered facts under the name, one per line, each behind its
  // glyph (owner, 2026-09-23: "ismin hemen altinda olsun. taglerle degil
  // sembollerle gosterelim"). A small gap above the first: they belong to
  // the name, not to the picture behind them.
  factRows: { gap: 2, marginTop: space.xs },
  factRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  // `flexShrink` so the text, not the row, is what runs out of width; the
  // glyph keeps its size and the name above keeps its place.
  factRowText: { ...type.bodySmall, color: color.textMuted, flexShrink: 1 },
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

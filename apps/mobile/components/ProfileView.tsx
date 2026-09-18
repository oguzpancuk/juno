import type { BigThree, NatalReading, PublicChart } from '@juno/astro';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
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
  GradientButton,
  SCREEN_PADDING,
  useTopGap,
} from '@/components/ui';
import { MAX_BIO_LENGTH, MAX_PHOTOS, type PhotoSource } from '@/lib/photos';
import { t } from '@/lib/strings';
import { color, radius, space, type } from '@/theme/tokens';

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
  bioInput: {
    ...type.body,
    color: color.text,
    minHeight: 96,
    textAlignVertical: 'top',
    padding: 0,
  },
});

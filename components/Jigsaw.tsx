import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';
import { tileOf, tileRect, type Section } from '@/lib/sections';

type TileProps = { section: Section; index: number; size: number };

/** One tile of the section picture, cropped at runtime from the single big image. */
export function Tile({ section, index, size }: TileProps) {
  const { row, col } = tileOf(index, section.cols);
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', borderRadius: 12 }}>
      <Image
        source={section.image}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          width: size * section.cols,
          height: size * section.rows,
          left: -col * size,
          top: -row * size,
        }}
      />
    </View>
  );
}

type JigsawGridProps = { section: Section; revealed: readonly string[]; width: number };

/** The whole section picture with an opaque cover over every unlearned word's tile. */
export function JigsawGrid({ section, revealed, width }: JigsawGridProps) {
  const cover = useThemeColor({}, 'cover');
  const coverBorder = useThemeColor({}, 'coverBorder');
  const shown = new Set(revealed);
  const height = (width / section.cols) * section.rows;
  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden' }}>
      <Image source={section.image} resizeMode="stretch" style={{ width, height }} />
      {section.words.map((w, i) => {
        if (shown.has(w.id)) return null;
        const r = tileRect(i, section.cols, section.rows, width);
        return (
          <View
            key={w.id}
            testID="cover"
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: Math.ceil(r.w) + 1,
              height: Math.ceil(r.h) + 1,
              backgroundColor: cover,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: coverBorder,
            }}
          />
        );
      })}
    </View>
  );
}

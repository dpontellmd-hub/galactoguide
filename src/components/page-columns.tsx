import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { layout } from '@/theme';

interface Props {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarSide?: 'left' | 'right';
  testID: string;
}

/** Sidebar content precedes the main content on compact screens and in reading order. */
export function PageColumns({ sidebar, children, sidebarSide = 'left', testID }: Props) {
  const { hasSupportingColumn } = useResponsiveLayout();
  return (
    <View testID={testID} style={[
      styles.stack,
      hasSupportingColumn && styles.columns,
      hasSupportingColumn && sidebarSide === 'right' && styles.reverse,
    ]}>
      <View testID={`${testID}-sidebar`} style={[styles.sidebar, hasSupportingColumn && styles.wideSidebar]}>
        {sidebar}
      </View>
      <View testID={`${testID}-main`} style={[styles.main, hasSupportingColumn && styles.wideMain]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { minWidth: 0 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: layout.desktopColumnGap },
  reverse: { flexDirection: 'row-reverse' },
  sidebar: { minWidth: 0 },
  wideSidebar: { width: layout.supportingColumnWidth, flexShrink: 0 },
  main: { minWidth: 0 },
  wideMain: { flex: 1 },
});

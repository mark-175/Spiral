import { StyleSheet } from 'react-native';

import { Colors, Fonts, MaxContentWidth } from './tokens';

export const sharedStyles = StyleSheet.create({
  pageWrap: {
    width: '100%',
    maxWidth: MaxContentWidth.page,
    alignSelf: 'center',
  },
  formWrap: {
    width: '100%',
    maxWidth: MaxContentWidth.form,
    alignSelf: 'center',
  },
  eyebrow: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  h1: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: 0,
    marginBottom: 36,
    maxWidth: 560,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 44,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 32,
  },
  logRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  logDate: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textMuted,
    width: 96,
    flexShrink: 0,
    paddingTop: 1,
  },
  logText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    flexShrink: 1,
  },
});

import { forwardRef } from 'react';
import { Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/** Use for screens containing editable inputs, including nested form components. */
export const FormScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function FormScrollView(props, ref) {
    const sharedProps: ScrollViewProps = {
      keyboardShouldPersistTaps: 'handled',
      keyboardDismissMode: Platform.select({ ios: 'interactive', android: 'on-drag', default: 'none' }),
      ...props,
    };

    // Browsers handle the virtual keyboard and focused DOM input themselves.
    if (Platform.OS === 'web') return <ScrollView ref={ref} {...sharedProps} />;

    return (
      <KeyboardAwareScrollView
        ref={(instance) => {
          if (typeof ref === 'function') return ref(instance);
          if (ref) ref.current = instance;
        }}
        bottomOffset={24}
        {...sharedProps}
      />
    );
  },
);

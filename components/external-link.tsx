import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { memo, useCallback, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export const ExternalLink = memo(function ExternalLink({ href, ...rest }: Props) {
  const handlePress = useCallback(async (event: any) => {
    if (process.env.EXPO_OS !== 'web') {
      // Prevent the default behavior of linking to the default browser on native.
      event.preventDefault();
      // Open the link in an in-app browser.
      await openBrowserAsync(href, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    }
  }, [href]);

  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={handlePress}
    />
  );
});

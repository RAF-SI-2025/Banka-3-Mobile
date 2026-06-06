declare module '@expo/vector-icons' {
  import * as React from 'react';

  type IconComponent = React.ComponentType<Record<string, unknown>> & {
    glyphMap: Record<string, string>;
  };

  export const Ionicons: IconComponent;
}

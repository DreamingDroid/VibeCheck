declare module 'react-quill' {
  import React from 'react';

  export interface ReactQuillProps {
    theme?: string;
    value?: string;
    defaultValue?: string;
    readOnly?: boolean;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    modules?: any;
    formats?: string[];
    onChange?: (
      content: string,
      delta: any,
      source: string,
      editor: any
    ) => void;
    children?: React.ReactNode;
  }

  export default class ReactQuill extends React.Component<ReactQuillProps> {}
}

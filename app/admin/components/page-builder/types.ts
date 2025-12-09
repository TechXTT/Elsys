// Page Builder Types

export type BlockInstance = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type BlockFieldType = 
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'select'
  | 'toggle'
  | 'image'
  | 'link'
  | 'color'
  | 'icon'
  | 'array';

export type BlockField = {
  name: string;
  label: string;
  type: BlockFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  fields?: BlockField[]; // For nested object fields
};

export type BlockCategory = 
  | 'layout'
  | 'content'
  | 'media'
  | 'interactive'
  | 'data';

export type BlockMeta = {
  type: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  category: BlockCategory;
  fields: BlockField[];
  defaultProps: Record<string, unknown>;
};

export type DragItem = {
  type: 'new-block' | 'existing-block';
  blockType?: string;
  blockId?: string;
  index?: number;
};

export type DropPosition = {
  index: number;
  position: 'before' | 'after';
};

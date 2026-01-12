// News Block Types

export type NewsBlockInstance = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

export type NewsBlockFieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "select"
  | "toggle"
  | "image"
  | "link"
  | "array";

export type NewsBlockField = {
  name: string;
  label: string;
  type: NewsBlockFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  fields?: NewsBlockField[]; // For nested fields in arrays
};

export type NewsBlockCategory = "text" | "media" | "layout" | "embed";

export type NewsBlockMeta = {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: NewsBlockCategory;
  fields: NewsBlockField[];
  defaultProps: Record<string, unknown>;
};

export type DragItem = {
  type: "new-block" | "existing-block";
  blockType?: string;
  blockId?: string;
  index?: number;
};

export type DropPosition = {
  index: number;
  position: "before" | "after";
};

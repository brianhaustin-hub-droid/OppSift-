import {
  useEffect,
  useId,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ElementType,
  type InputHTMLAttributes,
  type Key,
  type ReactNode,
} from "react";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      type={type}
      {...props}
    />
  );
}

export type CardProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

export function Card<T extends ElementType = "div">({
  as,
  className = "",
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";

  return <Component className={`ui-card ${className}`.trim()} {...props} />;
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
  wrapperClassName?: string;
};

export function TextInput({
  className = "",
  error,
  hint,
  id,
  label,
  wrapperClassName = "",
  ...props
}: TextInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [
    props["aria-describedby"],
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`ui-field ${wrapperClassName}`.trim()}>
      <label className="ui-field__label" htmlFor={inputId}>
        {label}
        {props.required && (
          <span aria-hidden="true" className="ui-field__required">
            *
          </span>
        )}
      </label>
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : props["aria-invalid"]}
        className={`ui-input ${className}`.trim()}
        id={inputId}
      />
      {hint && (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span
          className="ui-field__error"
          id={errorId}
          aria-live="polite"
        >
          {error}
        </span>
      )}
    </div>
  );
}

export type BadgeTone =
  | "success"
  | "warning"
  | "error"
  | "information"
  | "neutral";

export type BadgeProps = {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
};

export function Badge({
  children,
  className = "",
  tone = "neutral",
}: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone} ${className}`.trim()}>
      <span aria-hidden="true" className="ui-badge__marker" />
      {children}
    </span>
  );
}

export type NavigationLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  current?: boolean;
};

export function NavigationLink({
  children,
  className = "",
  current = false,
  ...props
}: NavigationLinkProps) {
  return (
    <a
      {...props}
      aria-current={current ? "page" : undefined}
      className={`ui-nav-link ${current ? "is-current" : ""} ${className}`.trim()}
    >
      {children}
    </a>
  );
}

export type TableColumn<Row> = {
  align?: "start" | "end";
  header: ReactNode;
  key: string;
  render: (row: Row) => ReactNode;
};

export type DataTableProps<Row> = {
  caption: string;
  className?: string;
  columns: readonly TableColumn<Row>[];
  emptyMessage: string;
  getRowKey: (row: Row, index: number) => Key;
  rows: readonly Row[];
};

export function DataTable<Row>({
  caption,
  className = "",
  columns,
  emptyMessage,
  getRowKey,
  rows,
}: DataTableProps<Row>) {
  return (
    <div
      aria-label={`${caption} table`}
      className={`ui-table-scroll ${className}`.trim()}
      role="region"
      tabIndex={0}
    >
      <table className="ui-table">
        <caption className="ui-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.align === "end" ? "is-end-aligned" : ""}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="ui-table__empty-row">
              <td
                className="ui-table__empty"
                colSpan={Math.max(columns.length, 1)}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                className="ui-table__row"
                key={getRowKey(row, rowIndex)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.align === "end" ? "is-end-aligned" : ""}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type ModalProps = {
  children: ReactNode;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function Modal({
  children,
  description,
  onOpenChange,
  open,
  title,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="ui-modal"
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <header className="ui-modal__header">
        <div>
          <h2 className="ui-modal__title" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="ui-modal__description" id={descriptionId}>
              {description}
            </p>
          )}
        </div>
        <form method="dialog">
          <Button
            aria-label="Close dialog"
            className="ui-modal__close"
            size="icon"
            type="submit"
            variant="tertiary"
          >
            <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </Button>
        </form>
      </header>
      <div className="ui-modal__body">{children}</div>
    </dialog>
  );
}

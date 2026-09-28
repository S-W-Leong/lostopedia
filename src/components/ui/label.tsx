import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error ? "text-danger" : "text-text-primary",
          className,
        )}
        {...props}
      >
        {children}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    );
  },
);
Label.displayName = "Label";

export { Label };

"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--color-background, #fff)",
          color: "var(--color-text-primary, #18181b)",
          border: "1px solid var(--color-border-tertiary, #e4e4e7)",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };

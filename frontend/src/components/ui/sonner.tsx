import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      closeButton={true}
      gap={12}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:pl-4 group-[.toaster]:pr-12 group-[.toaster]:py-3 group-[.toaster]:w-[356px] group-[.toaster]:max-w-[calc(100vw-32px)] group-[.toaster]:rounded-xl group-[.toaster]:border-2",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton: "!absolute !right-2 !top-1/2 !-translate-y-1/2 !left-auto !bg-transparent !text-foreground/70 hover:!text-foreground hover:!bg-muted/50 !rounded-md !p-1.5 !transition-all !border !border-border/40 hover:!border-border !w-8 !h-8 !flex !items-center !justify-center !m-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

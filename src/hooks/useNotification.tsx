import toast from "react-hot-toast";
import { Clock3 } from "lucide-react";

type NotificationType = "loading" | "success" | "error";

// Same card as the main admin app's transaction notifications (minus the tx link)
const CustomNotification = ({
  type,
  title,
  description,
  onDismiss,
}: {
  type: NotificationType;
  title: string;
  description: string;
  onDismiss: () => void;
}) => {
  const getStyles = () => {
    switch (type) {
      case "loading":
        return {
          bg: "bg-[var(--toast-loading-bg)]",
          icon: <Clock3 size={20} className="text-[var(--toast-foreground)]" aria-hidden />,
        };
      case "success":
        return {
          bg: "bg-[var(--toast-success-bg)]",
          icon: (
            <svg className="w-5 h-5 text-[var(--toast-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case "error":
        return {
          bg: "bg-[var(--toast-error-bg)]",
          icon: (
            <svg className="w-5 h-5 text-[var(--toast-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} text-[var(--toast-foreground)] rounded-lg p-4 shadow-lg min-w-[320px] max-w-sm`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs mt-1 break-words opacity-90">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs opacity-70">now</span>
          <button onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const show = (type: NotificationType, title: string, description: string, duration: number) =>
  // Keyed by content so the same message firing twice (e.g. a retried load) shows once
  toast.custom(
    (t) => <CustomNotification type={type} title={title} description={description} onDismiss={() => toast.remove(t.id)} />,
    { id: `${type}:${title}:${description}`, duration },
  );

// Helper function for simple success notifications
export const showSuccessNotification = (message: string, options?: { title?: string }) =>
  show("success", options?.title || "Success", message, 3000);

// Helper function for simple error notifications
export const showErrorNotification = (message: string, options?: { title?: string }) =>
  show("error", options?.title || "Error", message, 4000);

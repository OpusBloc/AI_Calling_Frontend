import toast from "react-hot-toast";

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
          bg: "bg-blue-500",
          icon: (
            <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ),
        };
      case "success":
        return {
          bg: "bg-green-500",
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      case "error":
        return {
          bg: "bg-red-500",
          icon: (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <div className={`${styles.bg} rounded-lg p-4 shadow-lg min-w-[320px] max-w-sm`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-white/90 mt-1 break-words">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-white/70">now</span>
          <button onClick={onDismiss} aria-label="Dismiss" className="text-white/70 hover:text-white transition-colors">
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

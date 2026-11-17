export default function AdminConfirmDialog({ confirmation, onCancel }) {
  if (!confirmation) return null;

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    danger = false,
    onConfirm,
  } = confirmation;

  return (
    <div className="admin-modal-backdrop">
      <section
        className="admin-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-message"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      >
        <h3 id="admin-confirm-title">{title}</h3>
        <p id="admin-confirm-message">{message}</p>
        <div className="admin-dispatch-actions">
          <button className="btn o" autoFocus onClick={onCancel} type="button">Cancel</button>
          <button
            className={`btn${danger ? ' admin-confirm-danger' : ''}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

import { useApp } from '../store/AppContext';

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className="toast" role="status">
      {toast}
    </div>
  );
}

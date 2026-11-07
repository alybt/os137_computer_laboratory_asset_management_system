export default function ChartMessage({children, error=false, onRetry}) {
  return <div className="chart-empty" role={error?'alert':'status'}><p>{children}</p>{onRetry && <button className="btn-secondary !py-1.5 text-xs" onClick={onRetry}>Try again</button>}</div>
}

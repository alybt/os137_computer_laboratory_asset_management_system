export default function Brand({ className = '' }) {
  return <img src={`${import.meta.env.BASE_URL}branding/clam-logo.png`}
    alt="CLAM — Computer Laboratory Asset Management" className={`clam-logo ${className}`}
    width="2172" height="724" />
}

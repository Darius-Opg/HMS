
export default function Button({ text, onClick, className, disabled = false }) {
    return (
        <button
            type="button"
            disabled={disabled}
            className={`app-button ${className || ""}`}
            onClick={onClick}
        >
            {text}
        </button>
    )
}
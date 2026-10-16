type ClientAvatarProps = {
    name: string;
    photoUrl?: string | null;
    size?: "sm" | "md" | "lg";
};

const sizeClasses = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
};

export default function ClientAvatar({ name, photoUrl, size = "md" }: ClientAvatarProps) {
    const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

    return (
        <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-semibold text-slate-600 ${sizeClasses[size]}`}>
            {photoUrl ? (
                // Cloudinary hosts the client-uploaded image; avoid requiring a global Next image host config.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={`Foto de ${name}`} className="h-full w-full object-cover" />
            ) : initials}
        </span>
    );
}

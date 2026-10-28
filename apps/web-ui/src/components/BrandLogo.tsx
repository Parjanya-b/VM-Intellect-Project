interface BrandLogoProps {
  variant?: "mark" | "lockup";
  size?: number | string;
  className?: string;
}

export function BrandLogo({ variant = "lockup", size, className = "" }: BrandLogoProps) {
  const imgSize = typeof size === "number" ? `${size}px` : size;

  if (variant === "mark") {
    return (
      <img
        src="/brand/logo-mark.png"
        alt="VM Intellect LLP"
        className={className}
        style={imgSize ? { width: imgSize, height: imgSize } : undefined}
        draggable={false}
      />
    );
  }

  // lockup variant
  return (
    <img
      src="/brand/logo-full.png"
      alt="VM Intellect LLP"
      className={className}
      style={imgSize ? { width: imgSize } : undefined}
      draggable={false}
    />
  );
}

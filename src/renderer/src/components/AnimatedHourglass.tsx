// Đồng hồ cát động (SVG + CSS trong main.css, lớp `hg-*`): cát chảy từ bầu trên xuống bầu dưới rồi lật 180°.
// Cát ở bầu dưới là ảnh đối xứng của cát ở bầu trên, nên sau khi lật hình trùng khung đầu: vòng lặp liền mạch.
// `paused`: đứng yên (vd. hết thời gian chờ). Máy bật giảm chuyển động (prefers-reduced-motion) cũng đứng yên.
type AnimatedHourglassProps = {
  /** Chiều cao (px); chiều rộng theo tỉ lệ 24:32. */
  size?: number;
  paused?: boolean;
  className?: string;
  /** Mô tả cho trình đọc màn hình; không truyền thì chỉ là hình trang trí. */
  label?: string;
};

const AnimatedHourglass = ({
  size = 32,
  paused = false,
  className = "",
  label
}: AnimatedHourglassProps) => (
  <svg
    width={(size * 24) / 32}
    height={size}
    viewBox="0 0 24 32"
    {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    data-testid="animated-hourglass"
    data-paused={paused ? "true" : "false"}
    className={`hg ${paused ? "hg-paused" : ""} ${className}`}
  >
    <g className="hg-flip">
      <path
        className="hg-glass"
        d="M5.5 4 C5.5 11 10.6 13.4 11.3 16 C10.6 18.6 5.5 21 5.5 28 M18.5 4 C18.5 11 13.4 13.4 12.7 16 C13.4 18.6 18.5 21 18.5 28"
      />
      <path
        className="hg-sand hg-sand-top"
        d="M6.6 5.5 H17.4 C17 11 13.6 13.6 12 15.6 C10.4 13.6 7 11 6.6 5.5 Z"
      />
      <path
        className="hg-sand hg-sand-bottom"
        d="M6.6 26.5 H17.4 C17 21 13.6 18.4 12 16.4 C10.4 18.4 7 21 6.6 26.5 Z"
      />
      <line className="hg-stream" x1="12" y1="15.6" x2="12" y2="26.5" />
      <rect className="hg-cap" x="3" y="1" width="18" height="3" rx="1.5" />
      <rect className="hg-cap" x="3" y="28" width="18" height="3" rx="1.5" />
    </g>
  </svg>
);

export default AnimatedHourglass;

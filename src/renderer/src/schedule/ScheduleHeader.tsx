import logo from "../assets/images/logo-text-new.svg";
import { ReelIcon } from "./ScheduleIcons";

interface ScheduleHeaderProps {
  date: string;
  clock: string;
  weekday: string;
  staleTime?: string;
}

const ScheduleHeader = ({ date, clock, weekday, staleTime }: ScheduleHeaderProps) => (
  <header className="schedule-header">
    <div className="header-reel" aria-hidden="true">
      <ReelIcon />
    </div>
    <div className="header-brand">
      <img src={logo} alt="Trung tâm Chiếu phim Quốc gia" className="brand-logo" />
      <p className="brand-caption">Điện ảnh kết nối cảm xúc</p>
    </div>

    <div className="header-title-group">
      <h1>Lịch chiếu hôm nay</h1>
      <time className="schedule-date">{date}</time>
      <p className="header-kicker">Phim hay · Trải nghiệm tuyệt vời</p>
    </div>

    <div className="schedule-clock-panel">
      <time className="schedule-clock">{clock}</time>
      <span className="schedule-weekday">{weekday}</span>
      <p className="clock-caption" aria-hidden="true">
        More than movies
      </p>
      {staleTime ? <span className="stale-badge">Dữ liệu lúc {staleTime}</span> : null}
    </div>
  </header>
);

export default ScheduleHeader;

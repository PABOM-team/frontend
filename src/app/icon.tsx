import { renderAppIcon } from "./_brand/app-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderAppIcon(size.width);
}

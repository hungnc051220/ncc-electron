"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";
import { BackgroundProps } from "@/types";

const templateHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title></title>
</head>
<body>
    Xin chào dsadas! <br /><br />

    Vé mời tham dự buổi chiếu phim của bạn đã được gửi đến email này. <br />
    Vui lòng kiểm tra thông tin chi tiết của vé mời dưới đây: <br /><br />

    Trân trọng.<br />
    Trung tâm chiếu phim quốc gia<br/>

</body>
</html>`;

interface PrintInvitationTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backgrounds: BackgroundProps[];
}

const PrintInvitationTicketDialog = ({
  open,
  onOpenChange,
  backgrounds,
}: PrintInvitationTicketDialogProps) => {
  const [selected, setSelected] = useState<string>("");
  const [email, setEmail] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [saveLocation, setSaveLocation] = useState("");
  const [emailContent, setEmailContent] = useState(templateHtml);

  useEffect(() => {
    window.electron?.getDefaultExportFolder().then(setSaveLocation);
  }, []);

  const handleSelectFolder = async () => {
    const path = await window.electron?.selectFolder();
    if (path) setSaveLocation(path);
  };

  const handleExport = async () => {
    await window.electron?.exportTicket({
      filmName: "BỐ GIÀ",
      filmNameEn: "Dad, I'm Sorry",
      countryName: "Vietnam",
      duration: "120",
      date: "20/01/2026",
      datetime: "20:00",
      room: "01",
      seat: "A12",
      imageSource: backgrounds[0].urlImage,
      qrImage: `<img src="data:image/png;base64,${123}" />`,
      barCode: "123456789",
      folder: saveLocation,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px]">
        <DialogHeader className="border-b">
          <DialogTitle>Xuất vé mời</DialogTitle>
        </DialogHeader>
        <div className="max-h-[75vh] overflow-y-auto">
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div>
                  <p className="text-sm font-semibold mb-1">Mẫu ảnh nền</p>
                  <Select value={selected} onValueChange={setSelected}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn mẫu ảnh nền" />
                    </SelectTrigger>
                    <SelectContent>
                      {backgrounds.map((img) => (
                        <SelectItem key={img.id} value={img.urlImage}>
                          {img.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-semibold mb-1">Thư mục lưu ảnh</p>
                  <div className="flex items-center w-full border rounded-md text-sm h-9">
                    <input
                      placeholder="Chọn thư mục lưu ảnh"
                      className="border-none outline-none flex-1 px-3 text-muted-foreground"
                      value={saveLocation}
                      readOnly
                    />
                    <Button
                      variant="outline"
                      onClick={handleSelectFolder}
                      className="h-9 rounded-r-0"
                    >
                      Chọn
                    </Button>
                  </div>
                </div>
                {selected ? (
                  <div className="mt-5">
                    <Image
                      src={selected}
                      alt="preview"
                      width={500}
                      height={254}
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-full h-[254px] bg-beerus mt-5" />
                )}
              </div>
              <div>
                <div>
                  <p className="text-sm font-semibold mb-1">Email người nhận</p>
                  <Input
                    placeholder="Nhập email"
                    className="w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-semibold mb-1">Tiêu đề email</p>
                  <Input
                    placeholder="Nhập tiêu đề"
                    className="w-full"
                    value={emailTitle}
                    onChange={(e) => setEmailTitle(e.target.value)}
                  />
                </div>

                <div className="mt-5">
                  <ReactQuill
                    value={emailContent}
                    onChange={setEmailContent}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Đóng
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleExport}>
            Xuất vé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintInvitationTicketDialog;

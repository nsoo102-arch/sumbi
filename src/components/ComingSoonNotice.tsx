"use client";

type ComingSoonNoticeProps = {
  onClose: () => void;
};

export function ComingSoonNotice({ onClose }: ComingSoonNoticeProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sumbi-text/20 px-4">
      <div className="sumbi-card w-full max-w-sm bg-sumbi-background p-8 text-center">
        <p className="sumbi-body mb-6">준비 중입니다.</p>
        <button type="button" onClick={onClose} className="sumbi-btn">
          확인
        </button>
      </div>
    </div>
  );
}

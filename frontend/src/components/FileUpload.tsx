import type { ChangeEvent } from "react";

type FileUploadProps = {
  onFileLoaded: (content: string) => void;
};

function FileUpload({
  onFileLoaded,
}: FileUploadProps) {
  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result;

      if (typeof content === "string") {
        onFileLoaded(content);
      }
    };

    reader.readAsText(file);
  }

  return (
    <div
      className="
        mt-4
        rounded-2xl
        border
        border-dashed
        border-emerald-300
        bg-emerald-50/60
        p-4
        transition
        hover:border-emerald-400
        hover:bg-emerald-50
        dark:border-emerald-700
        dark:bg-emerald-950/20
        dark:hover:border-emerald-500
        dark:hover:bg-emerald-950/30
      "
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label
            htmlFor="log-file"
            className="block text-sm font-bold text-slate-800 dark:text-slate-100"
          >
            Upload a log file
          </label>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Supported formats: .log and .txt
          </p>
        </div>

        <input
          id="log-file"
          type="file"
          accept=".log,.txt"
          onChange={handleFileChange}
          className="
            block
            w-full
            cursor-pointer
            text-sm
            text-slate-600
            dark:text-slate-300
            file:mr-4
            file:cursor-pointer
            file:rounded-xl
            file:border-0
            file:bg-slate-900
            file:px-4
            file:py-2.5
            file:text-sm
            file:font-semibold
            file:text-white
            file:transition
            hover:file:bg-slate-700
            dark:file:bg-emerald-600
            dark:hover:file:bg-emerald-500
            sm:w-auto
          "
        />
      </div>
    </div>
  );
}

export default FileUpload;
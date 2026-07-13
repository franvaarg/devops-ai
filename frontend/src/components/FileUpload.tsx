type FileUploadProps = {
  onFileLoaded: (content: string) => void;
};

function FileUpload({ onFileLoaded }: FileUploadProps) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

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
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <label
        htmlFor="log-file"
        className="mb-2 block text-sm font-semibold text-slate-800"
      >
        Upload a log file
      </label>

      <input
        id="log-file"
        type="file"
        accept=".log,.txt"
        onChange={handleFileChange}
        className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700"
      />

      <p className="mt-2 text-xs text-slate-500">
        Supported formats: .log and .txt
      </p>
    </div>
  );
}

export default FileUpload;
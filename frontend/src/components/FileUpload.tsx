type FileUploadProps = {
  onFileLoaded: (content: string) => void;
};

function FileUpload({ onFileLoaded }: FileUploadProps) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      onFileLoaded(e.target?.result as string);
    };

    reader.readAsText(file);
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <input
        type="file"
        accept=".log,.txt"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default FileUpload;
import { DocumentList } from "@/components/upload/DocumentList";
import { FileUploader } from "@/components/upload/FileUploader";

export default function UploadPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Upload Documents
        </h1>
        <p className="mt-2 text-sm text-zinc-300 sm:text-base">
          Upload your resume, company info, past interview questions
        </p>
      </div>

      <FileUploader />
      <DocumentList />
    </section>
  );
}
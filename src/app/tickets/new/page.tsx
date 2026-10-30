
"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTicketSchema } from "@/lib/validations/ticket";

type Priority = "Low" | "Medium" | "High" | "Urgent";

type Category = {
  _id: string;
  name: string;
  description: string;
  defaultPriority: Priority;
};

type Attachment = {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
};

type SelectedFile = {
  id: string;
  file: File;
  preview?: string;
};

type FieldErrors = {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  categories?: Category[];
  attachment?: Attachment;
  ticket?: {
    ticketNumber?: string;
    _id?: string;
  };
  errors?: Record<string, string[] | undefined>;
};

const priorities: {
  value: Priority;
  description: string;
}[] = [
  { value: "Low", description: "General request; not time-sensitive" },
  { value: "Medium", description: "Normal support request" },
  { value: "High", description: "Important issue needing quick attention" },
  { value: "Urgent", description: "Critical issue requiring immediate attention" },
];

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export default function NewTicketPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setPageError("");

      try {
        const response = await fetch("/api/categories", {
          cache: "no-store",
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Could not load categories.");
        }

        if (!cancelled) {
          setCategories(data.categories ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Could not load categories. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  function validateForm() {
    const parsed = createTicketSchema.safeParse({
      title,
      description,
      category,
      priority,
      attachments: [],
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;

      setErrors({
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        category: fieldErrors.category?.[0],
        priority: fieldErrors.priority?.[0],
      });

      return false;
    }

    setErrors({});
    return true;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPageError("");

    const files = Array.from(event.target.files ?? []);

    if (selectedFiles.length + files.length > MAX_FILES) {
      setPageError(`You can select a maximum of ${MAX_FILES} attachments.`);
      event.target.value = "";
      return;
    }

    const newFiles: SelectedFile[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setPageError(
          `${file.name} is not supported. Select JPG, PNG, WEBP, or PDF files.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setPageError(`${file.name} exceeds the 5 MB file size limit.`);
        continue;
      }

      if (file.size === 0) {
        setPageError(`${file.name} is empty.`);
        continue;
      }

      const selected: SelectedFile = {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
      };

      // Create a preview for image attachments.
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.onload = () => {
          setSelectedFiles((previous) =>
            previous.map((item) =>
              item.id === selected.id
                ? { ...item, preview: reader.result as string }
                : item
            )
          );
        };

        reader.readAsDataURL(file);
      }

      newFiles.push(selected);
    }

    if (newFiles.length > 0) {
      setSelectedFiles((previous) => [...previous, ...newFiles]);
    }

    // Allow selecting the same file again after removing it.
    event.target.value = "";
  }

  function removeFile(id: string) {
    setSelectedFiles((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  async function uploadAttachments(): Promise<Attachment[]> {
    if (selectedFiles.length === 0) {
      return [];
    }

    setUploading(true);

    try {
      const uploadedAttachments = await Promise.all(
        selectedFiles.map(async (selected) => {
          const formData = new FormData();
          formData.append("file", selected.file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data: ApiResponse = await response.json();

          if (!response.ok || !data.success || !data.attachment) {
            throw new Error(
              data.message || `Failed to upload ${selected.file.name}.`
            );
          }

          return data.attachment;
        })
      );

      return uploadedAttachments;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload attachments to Cloudinary.
      const attachments = await uploadAttachments();

      // 2. Create the ticket with uploaded attachment information.
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          attachments,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        if (data.errors) {
          setErrors({
            title: data.errors.title?.[0],
            description: data.errors.description?.[0],
            category: data.errors.category?.[0],
            priority: data.errors.priority?.[0],
          });
        }

        throw new Error(data.message || "Failed to create your ticket.");
      }

      const ticketNumber = data.ticket?.ticketNumber;

      setSuccess(
        ticketNumber
          ? `Your ticket ${ticketNumber} was created successfully.`
          : "Your support ticket was created successfully."
      );

      setTitle("");
      setDescription("");
      setCategory("");
      setPriority("Medium");
      setSelectedFiles([]);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <span aria-hidden="true">←</span>
          Back to dashboard
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-indigo-600 px-6 py-7 text-white sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-100">
              Campus HelpDesk
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Create a support ticket
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
              Tell us what you need help with. Our support team will review
              your request and respond as soon as possible.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 p-6 sm:p-8"
          >
            {pageError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1">{pageError}</p>

                {pageError.toLowerCase().includes("log in") && (
                  <Link
                    href="/login"
                    className="mt-2 inline-block font-semibold underline"
                  >
                    Go to login
                  </Link>
                )}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
              >
                <p className="font-semibold">{success}</p>
                <p className="mt-1">
                  You can return to your dashboard to continue.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex font-semibold underline"
                >
                  Go to dashboard
                </Link>
              </div>
            )}

            {/* Ticket title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Ticket title <span className="text-red-500">*</span>
              </label>

              <input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    title: undefined,
                  }));
                }}
                placeholder="e.g. Unable to access student portal"
                maxLength={150}
                required
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "title-error" : "title-help"}
                className={`w-full rounded-lg border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.title
                    ? "border-red-400 focus:ring-red-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              />

              {errors.title ? (
                <p id="title-error" className="mt-2 text-sm text-red-600">
                  {errors.title}
                </p>
              ) : (
                <p id="title-help" className="mt-2 text-xs text-slate-500">
                  Use 5–150 characters to describe the issue.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description <span className="text-red-500">*</span>
              </label>

              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrors((previous) => ({
                    ...previous,
                    description: undefined,
                  }));
                }}
                placeholder="Explain the problem, what you were trying to do, and any error message you saw..."
                rows={6}
                maxLength={10000}
                required
                aria-invalid={Boolean(errors.description)}
                aria-describedby={
                  errors.description ? "description-error" : "description-help"
                }
                className={`w-full resize-y rounded-lg border px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.description
                    ? "border-red-400 focus:ring-red-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              />

              <div className="mt-2 flex items-start justify-between gap-3">
                {errors.description ? (
                  <p id="description-error" className="text-sm text-red-600">
                    {errors.description}
                  </p>
                ) : (
                  <p id="description-help" className="text-xs text-slate-500">
                    Provide at least 10 characters of detail.
                  </p>
                )}

                <span className="shrink-0 text-xs text-slate-500">
                  {description.length}/10000
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Category <span className="text-red-500">*</span>
              </label>

              <select
                id="category"
                name="category"
                value={category}
                onChange={(event) => {
                  const selectedId = event.target.value;
                  setCategory(selectedId);

                  setErrors((previous) => ({
                    ...previous,
                    category: undefined,
                  }));

                  const selectedCategory = categories.find(
                    (item) => item._id === selectedId
                  );

                  if (selectedCategory) {
                    setPriority(selectedCategory.defaultPriority);
                  }
                }}
                disabled={loadingCategories || categories.length === 0}
                required
                aria-invalid={Boolean(errors.category)}
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  errors.category
                    ? "border-red-400 focus:ring-red-100"
                    : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
                }`}
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : categories.length === 0
                      ? "No categories available"
                      : "Select a category"}
                </option>

                {categories.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>

              {errors.category && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.category}
                </p>
              )}

              {!loadingCategories && categories.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  Categories could not be found. Make sure you have run your
                  seed script and are logged in.
                </p>
              )}

              {category && (
                <p className="mt-2 text-xs text-slate-500">
                  {categories.find((item) => item._id === category)?.description}
                </p>
              )}
            </div>

            {/* Priority */}
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-slate-800">
                Priority <span className="text-red-500">*</span>
              </legend>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {priorities.map((item) => (
                  <label
                    key={item.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      priority === item.value
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={item.value}
                      checked={priority === item.value}
                      onChange={() => {
                        setPriority(item.value);
                        setErrors((previous) => ({
                          ...previous,
                          priority: undefined,
                        }));
                      }}
                      className="mt-1 h-4 w-4 accent-indigo-600"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {item.value}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {errors.priority && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.priority}
                </p>
              )}
            </fieldset>

            {/* Attachments */}
            <div>
              <label
                htmlFor="attachments"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Attachments
                <span className="ml-2 font-normal text-slate-500">
                  (Optional)
                </span>
              </label>

              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
                <input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  disabled={submitting || selectedFiles.length >= MAX_FILES}
                  className="block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700 disabled:cursor-not-allowed"
                />

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Upload screenshots or documents that help explain your
                  problem. Supported formats: JPG, PNG, WEBP and PDF.
                  Maximum 3 files, 5 MB per file.
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Selected files ({selectedFiles.length}/{MAX_FILES})
                  </p>

                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.file.name}
                          className="h-14 w-14 rounded-md border border-slate-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-700">
                          PDF
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {item.file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        disabled={submitting}
                        className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploading && (
                <p className="mt-3 text-sm font-medium text-indigo-600">
                  Uploading attachments to Cloudinary...
                </p>
              )}
            </div>

            {/* Information */}
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">
                Before submitting
              </p>
              <p className="mt-1 leading-6">
                Please avoid including passwords or other sensitive
                information in your ticket description or attachments.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingCategories ||
                  categories.length === 0
                }
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading
                  ? "Uploading files..."
                  : submitting
                    ? "Submitting ticket..."
                    : "Submit ticket"}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Campus HelpDesk · Student and faculty support
        </p>
      </div>
    </main>
  );
}

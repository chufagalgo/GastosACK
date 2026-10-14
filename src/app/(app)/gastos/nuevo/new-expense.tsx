"use client";

import { useRef, useState } from "react";
import { Camera, Car, FileImage, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressImage, pdfFirstPageToJpeg } from "@/lib/client/image";
import type { Client } from "@/lib/supabase/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { createExpenseAction, discardUploadAction } from "../actions";
import { EMPTY_VALUES, ExpenseForm, type ExpenseFormValues } from "../expense-form";

interface Props {
  userId: string;
  month: string;
  defaultDate: string;
  clients: Client[];
  projects: { project: string; client_id: string | null }[];
  rate: number;
}

type Step =
  | { name: "pick" }
  | { name: "working"; label: string; preview?: string }
  | { name: "ticket"; preview: string; path: string; imagePath: string | null; values: ExpenseFormValues }
  | { name: "km" };

export function NewExpense({ userId, month, defaultDate, clients, projects, rate }: Props) {
  const [step, setStep] = useState<Step>({ name: "pick" });
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !file.type.startsWith("image/")) return void toast.error("Solo se admiten fotos o PDF.");
    if (file.size > 10 * 1024 * 1024 && isPdf) return void toast.error("El PDF es demasiado grande (máx. 10 MB).");

    const supabase = getSupabaseBrowser();
    const folder = `${userId}/${defaultDate.slice(0, 4)}/${defaultDate.slice(5, 7)}`;
    const id = crypto.randomUUID();
    const uploaded: string[] = [];
    try {
      setStep({ name: "working", label: isPdf ? "Preparando el PDF…" : "Comprimiendo la foto…" });
      const image = isPdf ? await pdfFirstPageToJpeg(file) : await compressImage(file);
      const preview = URL.createObjectURL(image);

      setStep({ name: "working", label: "Subiendo…", preview });
      const imagePath = `${folder}/${id}.jpg`;
      const up = await supabase.storage.from("receipts").upload(imagePath, image, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      uploaded.push(imagePath);
      let path = imagePath;
      if (isPdf) {
        path = `${folder}/${id}.pdf`;
        const upPdf = await supabase.storage.from("receipts").upload(path, file, { contentType: "application/pdf" });
        if (upPdf.error) throw upPdf.error;
        uploaded.push(path);
      }

      const values = { ...EMPTY_VALUES, date: defaultDate };
      setStep({ name: "ticket", preview, path, imagePath: isPdf ? imagePath : null, values });
    } catch (e) {
      console.error(e);
      toast.error("No se ha podido subir el ticket. Inténtalo de nuevo.");
      if (uploaded.length) void discardUploadAction(uploaded);
      setStep({ name: "pick" });
    }
  }

  function discard() {
    if (step.name === "ticket") {
      void discardUploadAction([step.path, ...(step.imagePath ? [step.imagePath] : [])]);
      URL.revokeObjectURL(step.preview);
    }
    setStep({ name: "pick" });
  }

  if (step.name === "pick") {
    return (
      <div className="grid gap-3">
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        <Button size="lg" className="h-24 text-lg" onClick={() => cameraRef.current?.click()}>
          <Camera className="size-7" aria-hidden /> Hacer foto del ticket
        </Button>
        <Button size="lg" variant="outline" className="h-16" onClick={() => fileRef.current?.click()}>
          <FileImage className="size-5" aria-hidden /> Elegir imagen o PDF
        </Button>
        <Button size="lg" variant="outline" className="h-16" onClick={() => setStep({ name: "km" })}>
          <Car className="size-5" aria-hidden /> Solo kilometraje (sin ticket)
        </Button>
      </div>
    );
  }

  if (step.name === "working") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        {step.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.preview} alt="Ticket" className="max-h-72 rounded-lg border object-contain" />
        )}
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {step.label}
        </p>
      </div>
    );
  }

  if (step.name === "km") {
    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">🚗 Desplazamiento</p>
          <Button variant="ghost" size="sm" onClick={() => setStep({ name: "pick" })}>
            <X aria-hidden /> Cancelar
          </Button>
        </div>
        <ExpenseForm
          kind="km"
          month={month}
          initial={{ ...EMPTY_VALUES, date: defaultDate }}
          clients={clients}
          projects={projects}
          rate={rate}
          action={createExpenseAction.bind(null, "km")}
          isNew
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.preview} alt="Ticket" className="h-32 w-24 shrink-0 rounded-lg border bg-background object-contain" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Ticket subido</p>
          <p className="mt-1 text-muted-foreground">Rellena los datos del ticket y guarda.</p>
          <Button variant="ghost" size="sm" className="mt-2 -ml-2 text-destructive" onClick={discard}>
            <X aria-hidden /> Descartar
          </Button>
        </div>
      </div>
      <ExpenseForm
        kind="ticket"
        month={month}
        initial={step.values}
        clients={clients}
        projects={projects}
        rate={rate}
        action={createExpenseAction.bind(null, "ticket")}
        isNew
        receipt={{ path: step.path, imagePath: step.imagePath }}
      />
    </>
  );
}

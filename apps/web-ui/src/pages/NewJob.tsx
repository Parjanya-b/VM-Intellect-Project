import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateJobRequestSchema, type Job, type JobConstraints } from "@vmi/contracts";
import { ApiError } from "../lib/api";
import { createJob, getJob } from "../lib/jobs";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Textarea } from "../components/Textarea";
import FileList from "../components/FileList";
import FileUploader from "../components/FileUploader";

const TOTAL_STEPS = 3;

// Form values are strings; they are converted to the API shape on submit.
const schema = z.object({
  title: CreateJobRequestSchema.shape.title,
  goal: CreateJobRequestSchema.shape.goal,
  material: z.string().trim().max(80, "At most 80 characters"),
  quantity: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 10_000_000),
      "Enter a whole number from 1 to 10,000,000",
    ),
  tolerance: z.string().trim().max(80, "At most 80 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function NewJob() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [created, setCreated] = useState<Job | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", goal: "", material: "", quantity: "", tolerance: "" },
  });

  async function next() {
    if (await trigger(["title", "goal"])) setStep(2);
  }

  const onSubmit = handleSubmit(async (v) => {
    setServerError(null);
    const constraints: JobConstraints = {};
    if (v.material) constraints.material = v.material;
    if (v.quantity) constraints.quantity = Number(v.quantity);
    if (v.tolerance) constraints.tolerance = v.tolerance;
    try {
      const job = await createJob({ title: v.title, goal: v.goal, constraints });
      await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setCreated(job);
      setStep(3);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Unexpected error.");
    }
  });

  // Pressing Enter on step 1 must go to step 2, never create the job.
  function submit(e: FormEvent<HTMLFormElement>) {
    if (step === 1) {
      e.preventDefault();
      void next();
      return;
    }
    return onSubmit(e);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-semibold">New job</h1>
      <p className="mt-1 text-sm text-muted">
        Step {step} of {TOTAL_STEPS} ·{" "}
        {step === 1 ? "Details" : step === 2 ? "Constraints (optional)" : "Files (optional)"}
      </p>

      {step === 3 && created ? (
        <FilesStep job={created} onFinish={() => navigate(`/jobs/${created.id}`)} />
      ) : (
        <form
          onSubmit={submit}
          noValidate
          className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6"
        >
          <div className={step === 1 ? "space-y-4" : "hidden"}>
            <Field label="Title" error={errors.title?.message} {...register("title")} />
            <Textarea
              label="Goal"
              placeholder="What do you want to achieve?"
              error={errors.goal?.message}
              {...register("goal")}
            />
          </div>

          <div className={step === 2 ? "space-y-4" : "hidden"}>
            <Field label="Material" error={errors.material?.message} {...register("material")} />
            <Field
              label="Quantity"
              inputMode="numeric"
              error={errors.quantity?.message}
              {...register("quantity")}
            />
            <Field
              label="Tolerance"
              placeholder="e.g. ±0.05 mm"
              error={errors.tolerance?.message}
              {...register("tolerance")}
            />
          </div>

          {serverError && (
            <p role="alert" className="text-sm text-danger">
              {serverError}
            </p>
          )}

          <div className="flex justify-between pt-2">
            {step === 1 ? (
              <Button type="button" variant="secondary" onClick={() => navigate("/jobs")}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            {step === 1 ? (
              <Button key="next" type="button" onClick={() => void next()}>
                Next
              </Button>
            ) : (
              <Button key="submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create job"}
              </Button>
            )}
          </div>
        </form>
      )}
    </main>
  );
}

function FilesStep({ job, onFinish }: { job: Job; onFinish: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ["job", job.id], queryFn: () => getJob(job.id) });
  return (
    <div className="mt-6 space-y-4 rounded-lg border border-line bg-white p-6">
      <p className="text-sm text-muted">
        Job <span className="font-medium text-ink">{job.title}</span> was created. Add drawings and
        data now, or skip and add them later.
      </p>
      <FileUploader
        jobId={job.id}
        onUploaded={() => void qc.invalidateQueries({ queryKey: ["job", job.id] })}
      />
      <FileList jobId={job.id} files={detail.data?.files ?? []} canEdit />
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={onFinish}>
          Finish
        </Button>
      </div>
    </div>
  );
}

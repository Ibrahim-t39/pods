// /app/profile/edit: everything about you on one page, saved as you go (redesign r2; Doji / Tripadvisor edit pages).
//   photo + first name + age (Change opens the birthday) · what you're into (chips; adding one looks for a pod) · community pods · when you're free
//   laptop: photo + name and communities left, interests and free times right. Done returns to the profile.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Disc } from "@/components/brand/disc";
import { GENTLE, STAGGER } from "@/components/brand/motion";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui";
import { useHydrated, useMe, useRepo } from "@/lib/db/hooks";
import { ageOn, displayName } from "@/lib/utils";
import { nowISO } from "@/lib/time/clock";
import { placementDefaults } from "@/config/placement";
import { birthdayProblem } from "./age";
import { CommunityPicker, FreeGrid, LikesPicker, useToggleSlot } from "./seat-sheets";
import { PillField } from "./kit";
import { Card, Section, TextAction, YouHead, YouPage } from "./you-kit";

export function ProfileEdit() {
  const me = useMe();
  const hydrated = useHydrated();
  const router = useRouter();
  const repo = useRepo();
  const toggle = useToggleSlot();
  const file = useRef<HTMLInputElement>(null);
  const [first, setFirst] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dobOpen, setDobOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [dobErr, setDobErr] = useState<string | null>(null);
  const [dobSaving, setDobSaving] = useState(false);
  useEffect(() => {
    if (hydrated && !me) router.replace("/app");
  }, [hydrated, me, router]);
  useEffect(() => {
    if (me) setFirst(me.first_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);
  if (!hydrated || !me) return null;

  function pickPhoto(f: File | undefined) {
    if (!f || !me) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const r = await repo.setPhotos([String(reader.result), ...me.photo_urls.slice(1)]);
      if (r.ok) notify("Photo saved");
      else notify.error("Photo not saved. Try a JPG or PNG.");
    };
    reader.readAsDataURL(f);
  }

  const dirty = first.trim() !== me.first_name;
  async function saveName() {
    if (!me) return;
    if (!first.trim()) return setNameErr("Add your first name.");
    setSaving(true);
    const r = await repo.updateAbout({ first_name: first.trim(), nickname: me.nickname, date_of_birth: me.date_of_birth, city: me.city });
    setSaving(false);
    if (!r.ok) return setNameErr(r.error.code === "VALIDATION" ? (r.error.message ?? "Check this.") : "Not saved. Try again.");
    notify("Name saved");
  }

  const today = nowISO();
  const age = ageOn(me.date_of_birth, today);
  async function saveBirthday() {
    if (!me) return;
    const problem = birthdayProblem(dob, today, placementDefaults);
    if (problem) return setDobErr(problem);
    setDobSaving(true);
    const r = await repo.updateAbout({ first_name: me.first_name, nickname: me.nickname, date_of_birth: dob, city: me.city });
    setDobSaving(false);
    if (!r.ok) return setDobErr(r.error.code === "VALIDATION" ? (r.error.message ?? "Check this.") : "Not saved. Try again.");
    setDobOpen(false);
    notify(`Your age shows as ${ageOn(dob, today)}`);
  }

  const photo = me.photo_urls[0];
  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { ...GENTLE, delay: 0.04 + i * STAGGER } });

  return (
    <YouPage>
      <YouHead
        back="/app/profile"
        backLabel="Your profile"
        title="Edit profile"
        sub="Changes save as you go."
        actions={<TextAction href="/app/profile">Done</TextAction>}
      />
      <div className="yo-wrap yo-body">
        <div className="yo-cols">
          <div>
            <motion.div {...fade(0)}>
              <Section label="You">
                <Card className="yo-pad">
                  <div className="flex items-center gap-s4">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="size-16 shrink-0 rounded-full object-cover" />
                    ) : (
                      <Disc initial={displayName(me).slice(0, 1)} size={64} />
                    )}
                    <Button variant="secondary" size="sm" onClick={() => file.current?.click()} leadingIcon={<Icon name="edit" size={16} />}>
                      {photo ? "Change photo" : "Add a photo"}
                    </Button>
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
                  </div>
                  <div className="mt-s4 flex items-end gap-s2">
                    <div className="min-w-0 flex-1">
                      <PillField
                        label="First name"
                        value={first}
                        maxLength={30}
                        autoComplete="given-name"
                        onChange={(v) => {
                          setFirst(v);
                          setNameErr(null);
                        }}
                        error={nameErr}
                      />
                    </div>
                    {dirty && (
                      <Button size="lg" variant="secondary" loading={saving} onClick={saveName} className={nameErr ? "mb-[26px]" : undefined}>
                        Save
                      </Button>
                    )}
                  </div>
                  <p className="mt-s3 text-[14px] text-ink-2">Only your first name shows.</p>
                  <div className="mt-s4 flex min-h-11 items-center justify-between gap-s3 border-t border-line pt-s3">
                    <p className="text-[15px] text-ink">
                      Your age shows as <span className="tabular-nums">{age}</span>
                    </p>
                    {!dobOpen && (
                      <TextAction
                        onClick={() => {
                          setDob(me.date_of_birth.slice(0, 10));
                          setDobErr(null);
                          setDobOpen(true);
                        }}
                      >
                        Change
                      </TextAction>
                    )}
                  </div>
                  {dobOpen && (
                    <div className="mt-s2 flex items-end gap-s2">
                      <div className="min-w-0 flex-1">
                        <PillField
                          type="date"
                          label="Birthday"
                          value={dob}
                          max={today.slice(0, 10)}
                          autoComplete="bday"
                          onChange={(v) => {
                            setDob(v);
                            setDobErr(null);
                          }}
                          error={dobErr}
                        />
                      </div>
                      <Button size="lg" variant="secondary" loading={dobSaving} onClick={saveBirthday} className={dobErr ? "mb-[26px]" : undefined}>
                        Save
                      </Button>
                    </div>
                  )}
                </Card>
              </Section>
            </motion.div>

            <motion.div {...fade(1)} id="into">
              <Section label="What you’re into" className="mt-s6">
                <Card className="yo-pad pt-s6 lg:pt-s6">
                  <LikesPicker />
                </Card>
              </Section>
            </motion.div>
          </div>

          <div>
            <motion.div {...fade(3)}>
              <Section label="When you’re free">
                <Card className="yo-pad">
                  <FreeGrid slots={me.availability} onToggle={toggle} />
                  <p className="mt-s3 text-[14px] text-ink-2">Tap a time to switch it. The AI plans inside these.</p>
                </Card>
              </Section>
            </motion.div>
            <motion.div {...fade(2)}>
              <Section label="Community pods" className="mt-s6">
                <Card className="yo-pad">
                  <p className="mb-s2 text-[14px] text-ink-2">Optional. Only members of that pod see it.</p>
                  <CommunityPicker />
                </Card>
              </Section>
            </motion.div>
          </div>
        </div>
      </div>
    </YouPage>
  );
}

import { motion, AnimatePresence } from "motion/react";
import { Settings, X, ShieldCheck, Send, Check } from "lucide-react";
import { useState } from "react";
import { Orbit } from "@ooakloowj/orbit";
import { Tooltip } from "./Tooltip";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!feedback.trim() || sending) return;
    setSending(true);
    await Orbit.sendFeedback({ content: feedback.trim(), contact: contact.trim() || undefined });
    setSending(false);
    setSent(true);
    setFeedback("");
    setContact("");
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <>
      <Tooltip label="设置">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setOpen(true)}
          className="w-7 h-7 flex items-center justify-center rounded-lg
                     text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          <Settings size={15} />
        </motion.button>
      </Tooltip>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50"
            />

            <motion.div
              key="settings-modal"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-white border border-neutral-200
                              shadow-xl rounded-2xl w-[420px] max-h-[80vh]
                              overflow-y-auto pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <span className="text-[14px] font-bold text-neutral-800">设置</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg
                               text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
                  >
                    <X size={15} />
                  </motion.button>
                </div>

                <div className="px-5 pb-5 space-y-5">
                  {/* ── Feedback Section ── */}
                  <section>
                    <div className="text-[10px] font-medium text-neutral-400 mb-2.5 uppercase tracking-wide">
                      意见反馈
                    </div>

                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="告诉我们你的想法、建议或遇到的问题..."
                      rows={3}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl
                                 px-3 py-2.5 text-[12px] text-neutral-800 placeholder:text-neutral-300
                                 resize-none outline-none focus:border-neutral-400 transition-colors"
                    />

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="联系方式（选填）"
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg
                                   px-2.5 py-1.5 text-[11px] text-neutral-800 placeholder:text-neutral-300
                                   outline-none focus:border-neutral-400 transition-colors"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={!feedback.trim() || sending}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                   transition-colors cursor-pointer
                                   ${sent
                                     ? "bg-emerald-500 text-white"
                                     : feedback.trim()
                                       ? "bg-neutral-800 text-white hover:bg-neutral-700"
                                       : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
                                   }`}
                      >
                        {sent ? <Check size={12} /> : <Send size={11} />}
                        {sent ? "已发送" : "发送"}
                      </motion.button>
                    </div>
                  </section>

                  {/* ── Divider ── */}
                  <div className="border-t border-neutral-100" />

                  {/* ── Legal Disclaimer ── */}
                  <section>
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <ShieldCheck size={12} className="text-neutral-400" />
                      <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide">
                        地图数据声明
                      </span>
                    </div>

                    <div className="bg-neutral-50 rounded-xl px-3.5 py-3 space-y-2.5 text-[11px] leading-[1.7] text-neutral-400">
                      <p>
                        本应用地图功能仅用于个人收藏内容的地理可视化，不具备任何测绘资质，
                        地图展示不代表对任何国家或地区主权、领土边界的官方认定。
                      </p>
                      <p>
                        <span className="text-neutral-600 font-medium">中华人民共和国领土</span>包括但不限于中国大陆及其沿海岛屿、
                        <span className="text-neutral-600 font-medium">台湾省</span>及其附属岛屿（含钓鱼岛及其附属岛屿）、
                        <span className="text-neutral-600 font-medium">南海诸岛</span>（含东沙群岛、西沙群岛、中沙群岛、南沙群岛）
                        等全部领土。
                      </p>
                      <p>
                        受可视化方案限制，地图仅按<span className="text-neutral-600 font-medium">省级/州级行政区划</span>聚合显示数据，
                        部分远洋岛屿及海域可能未在默认视口中呈现，
                        但这不代表对相关领土主权的任何立场变化。
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

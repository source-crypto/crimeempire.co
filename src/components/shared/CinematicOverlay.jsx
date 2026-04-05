import { motion, AnimatePresence } from 'framer-motion';

export default function CinematicOverlay({ show, title, subtitle, icon, outcome, onComplete }) {
  const isSuccess = outcome === 'success';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
          onClick={onComplete}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
            className={`text-center p-12 rounded-2xl border-2 max-w-md mx-4 ${
              isSuccess
                ? 'border-green-500 bg-gradient-to-b from-green-950 to-slate-950'
                : outcome === 'failed'
                ? 'border-red-500 bg-gradient-to-b from-red-950 to-slate-950'
                : 'border-purple-500 bg-gradient-to-b from-purple-950 to-slate-950'
            }`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 8 }}
              className="text-7xl mb-4"
            >
              {icon || (isSuccess ? '✅' : outcome === 'failed' ? '❌' : '⚡')}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`text-3xl font-bold mb-2 ${isSuccess ? 'text-green-400' : outcome === 'failed' ? 'text-red-400' : 'text-purple-400'}`}
            >
              {title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-gray-300 text-lg"
            >
              {subtitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-gray-500 text-sm mt-6"
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
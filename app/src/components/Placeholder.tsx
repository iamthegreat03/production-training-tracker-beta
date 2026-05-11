import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'

interface PlaceholderProps { title: string; description: string }

export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="page-header">
        <h1 className="page-title font-display">{title}</h1>
        <p className="page-subtitle">{description}</p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center card rounded-2xl"
      >
        <div className="p-5 rounded-2xl bg-orange-500/10 mb-4">
          <Construction className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="font-display font-bold text-lg text-primary">Coming Soon</h2>
        <p className="text-sm text-muted-c mt-1 text-center max-w-xs">
          This section is being migrated. It will be fully functional shortly.
        </p>
      </motion.div>
    </div>
  )
}

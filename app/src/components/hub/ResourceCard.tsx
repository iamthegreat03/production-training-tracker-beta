import { useState } from 'react'
import {
  ExternalLink, Copy, Check, Pencil, Trash2,
  BookOpen, Globe, Link2, FileText, Lightbulb, Palette, Code2,
  Download, Image, Layers, Sparkles, Wrench, Star, Rocket, Play,
  Box, BookMarked, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HubResource } from '@/types/database'

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Globe, Link2, FileText, Lightbulb, Palette, Code2,
  Download, Image, Layers, Sparkles, Wrench, Star, Rocket, Play,
  Box, BookMarked,
}

export function getResourceIcon(name: string | null): LucideIcon {
  return (name && ICON_MAP[name]) ? ICON_MAP[name] : BookOpen
}

export const ICON_OPTIONS = Object.keys(ICON_MAP)

export const CATEGORY_META = {
  learn:       { label: 'Learn',       color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    glowRgb: '59,130,246'  },
  assets:      { label: 'Assets',      color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  glowRgb: '168,85,247'  },
  inspiration: { label: 'Inspiration', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  glowRgb: '249,115,22'  },
  code:        { label: 'Code',        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glowRgb: '16,185,129'  },
}

function isNewResource(createdAt: string | null): boolean {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
}

function NewBadge() {
  return (
    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white leading-none">
      New
    </span>
  )
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname }
  catch { return url }
}

interface ResourceCardProps {
  resource: HubResource
  editMode: boolean
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export default function ResourceCard({ resource, editMode, onClick, onEdit, onDelete }: ResourceCardProps) {
  const [copied, setCopied] = useState(false)
  const meta = CATEGORY_META[resource.category]
  const isNew = isNewResource(resource.created_at)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    if (!resource.content) return
    navigator.clipboard.writeText(resource.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const EditControls = () => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-orange-500/10 text-muted-c hover:text-orange-500 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-c hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  // ── Code card ──
  if (resource.category === 'code') {
    const previewLines = resource.content?.split('\n').slice(0, 5).join('\n') ?? ''
    return (
      <div
        onClick={onClick}
        className="card rounded-2xl p-4 space-y-3 group cursor-pointer hover:border-emerald-500/30 hover:shadow-lg transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest', meta.bg, meta.color)}>
              {resource.language ?? 'CODE'}
            </span>
            {isNew && <NewBadge />}
          </div>
          {editMode && <EditControls />}
        </div>

        <div>
          <div className="font-bold text-primary text-sm leading-tight">{resource.title}</div>
          {resource.description && (
            <p className="text-[11px] text-muted-c mt-1 line-clamp-1">{resource.description}</p>
          )}
        </div>

        <div className="relative">
          <pre className="rounded-xl p-3 text-[10px] font-mono text-secondary overflow-hidden leading-relaxed"
            style={{ background: 'rgb(var(--surface-2))', maxHeight: '72px' }}>
            {previewLines}
          </pre>
          <div className="absolute bottom-0 left-0 right-0 h-6 rounded-b-xl pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgb(var(--surface-2)), transparent)' }} />
        </div>

        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all px-2.5 py-1.5 rounded-lg',
            copied
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-surface-2 text-muted-c hover:text-primary',
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    )
  }

  // ── Inspiration card with thumbnail ──
  if (resource.category === 'inspiration' && resource.thumbnail_url) {
    return (
      <div
        onClick={onClick}
        className="card rounded-2xl overflow-hidden group cursor-pointer hover:border-orange-500/30 hover:shadow-lg transition-all"
      >
        <div className="aspect-video bg-surface-2 overflow-hidden relative">
          <img
            src={resource.thumbnail_url}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {isNew && <div className="absolute top-2 left-2"><NewBadge /></div>}
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-primary text-sm leading-tight">{resource.title}</div>
            {editMode && <EditControls />}
          </div>
          {resource.description && (
            <p className="text-[11px] text-muted-c line-clamp-2">{resource.description}</p>
          )}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {resource.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-surface-2 rounded text-[9px] font-bold text-muted-c uppercase tracking-wide">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Assets card with thumbnail ──
  if (resource.category === 'assets' && resource.thumbnail_url) {
    return (
      <div
        onClick={onClick}
        className="card rounded-2xl overflow-hidden group cursor-pointer hover:border-purple-500/30 hover:shadow-lg transition-all"
      >
        <div className="h-28 bg-surface-2 overflow-hidden relative">
          <img
            src={resource.thumbnail_url}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {isNew && <div className="absolute top-2 left-2"><NewBadge /></div>}
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-primary text-sm">{resource.title}</div>
            {editMode && <EditControls />}
          </div>
          {resource.description && (
            <p className="text-[11px] text-muted-c line-clamp-2">{resource.description}</p>
          )}
          {resource.external_url && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-purple-400">
              <Download className="w-3 h-3" />
              <span>Download / Open</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Default card (learn / assets without thumbnail / inspiration without thumbnail) ──
  const Icon = getResourceIcon(resource.icon_name)
  return (
    <div
      onClick={onClick}
      className={cn(
        'card rounded-2xl p-4 space-y-3 group cursor-pointer hover:shadow-lg transition-all',
        resource.category === 'learn' && 'hover:border-blue-500/30',
        resource.category === 'assets' && 'hover:border-purple-500/30',
        resource.category === 'inspiration' && 'hover:border-orange-500/30',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
            <Icon className={cn('w-4 h-4', meta.color)} />
          </div>
          {isNew && <NewBadge />}
        </div>
        {editMode && <EditControls />}
      </div>

      <div>
        <div className="font-bold text-primary text-sm leading-tight">{resource.title}</div>
        {resource.description && (
          <p className="text-[11px] text-muted-c mt-1 line-clamp-2 leading-relaxed">{resource.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {resource.external_url && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-c">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{safeHostname(resource.external_url)}</span>
          </div>
        )}
        {resource.tags && resource.tags.length > 0 && resource.tags.slice(0, 2).map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-surface-2 rounded text-[9px] font-bold text-muted-c uppercase tracking-wide">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

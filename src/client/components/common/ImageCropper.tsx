import { useState, useRef, useEffect } from 'react'
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export default function ImageCropper({ 
    image, 
    onCancel, 
    onConfirm 
}: { 
    image: string
    onCancel: () => void
    onConfirm: (croppedImage: string) => void
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const imgRef = useRef<HTMLImageElement>(new Image())

    useEffect(() => {
        imgRef.current.src = image
        imgRef.current.onload = () => {
            // Initial center
            draw()
        }
    }, [image])

    useEffect(() => {
        draw()
    }, [scale, offset])

    const draw = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Fill background
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const img = imgRef.current
        
        // Draw image with transformations
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        
        ctx.save()
        ctx.translate(centerX + offset.x, centerY + offset.y)
        ctx.scale(scale, scale)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setOffset({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleSave = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        onConfirm(dataUrl)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">Ajustar Imagen</h3>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="relative h-80 w-full bg-gray-900 overflow-hidden cursor-move flex items-center justify-center"
                     onMouseDown={handleMouseDown}
                     onMouseMove={handleMouseMove}
                     onMouseUp={handleMouseUp}
                     onMouseLeave={handleMouseUp}
                >
                    <canvas 
                        ref={canvasRef}
                        width={300}
                        height={300}
                        className="rounded-lg shadow-2xl border-2 border-white/20"
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 text-white">
                        <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))}><ZoomOut size={18} /></button>
                        <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(s => s + 0.1)}><ZoomIn size={18} /></button>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}><RotateCcw size={18} /></button>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 flex items-center gap-2"
                    >
                        <Check size={16} /> Guardar
                    </button>
                </div>
            </div>
        </div>
    )
}

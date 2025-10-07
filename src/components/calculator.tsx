'use client'

import { useState } from 'react'
import { Delete, Plus, Trash2 } from 'lucide-react'

type MemoItem = {
  id: string
  item: string
  value: string
}

export function CalculatorComponent() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<string | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  const [memoItems, setMemoItems] = useState<MemoItem[]>([
    { id: '1', item: '', value: '' }
  ])

  const calculate = (firstOperand: string, secondOperand: string, operator: string): string => {
    const prev = parseFloat(firstOperand)
    const current = parseFloat(secondOperand)

    switch (operator) {
      case '+':
        return String(prev + current)
      case '-':
        return String(prev - current)
      case '×':
        return String(prev * current)
      case '÷':
        return current !== 0 ? String(prev / current) : 'Error'
      default:
        return secondOperand
    }
  }

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.')
    }
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
  }

  const performOperation = (nextOperator: string) => {
    const inputValue = display

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operator) {
      const currentValue = previousValue || '0'
      const newValue = calculate(currentValue, inputValue, operator)

      setDisplay(String(newValue))
      setPreviousValue(String(newValue))
    }

    setWaitingForOperand(true)
    setOperator(nextOperator)
  }

  const performCalculation = () => {
    const inputValue = display

    if (previousValue !== null && operator) {
      const newValue = calculate(previousValue, inputValue, operator)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperator(null)
      setWaitingForOperand(true)
    }
  }

  const addMemoItem = () => {
    const newId = String(memoItems.length + 1)
    setMemoItems([...memoItems, { id: newId, item: '', value: '' }])
  }

  const deleteMemoItem = (id: string) => {
    if (memoItems.length > 1) {
      setMemoItems(memoItems.filter(item => item.id !== id))
    }
  }

  const updateMemoItem = (id: string, field: 'item' | 'value', value: string) => {
    setMemoItems(memoItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const Button = ({
    onClick,
    className = '',
    children,
    variant = 'default'
  }: {
    onClick: () => void
    className?: string
    children: React.ReactNode
    variant?: 'default' | 'operator' | 'clear' | 'equals'
  }) => {
    let buttonStyles = 'h-12 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 active:scale-95 '

    switch (variant) {
      case 'operator':
        buttonStyles += 'text-white font-bold'
        break
      case 'clear':
        buttonStyles += 'text-white font-bold'
        break
      case 'equals':
        buttonStyles += 'text-white font-bold'
        break
      default:
        buttonStyles += 'bg-white/80 hover:bg-white text-gray-800 border border-gray-300'
    }

    const getButtonColor = () => {
      switch (variant) {
        case 'operator':
          return { backgroundColor: '#FFB300' }
        case 'clear':
          return { backgroundColor: '#ef4444' }
        case 'equals':
          return { backgroundColor: '#4abf79' }
        default:
          return {}
      }
    }

    return (
      <button
        className={`${buttonStyles} ${className}`}
        onClick={onClick}
        style={getButtonColor()}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Panel */}
        <div className="glass rounded-lg p-4 space-y-3" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          {/* Display */}
          <div className="bg-gray-100 p-3 rounded-lg border">
            <div
              className="text-right text-xl font-mono min-h-8 break-all"
              style={{ color: '#22211A' }}
            >
              {display}
            </div>
          </div>

          {/* Button Grid */}
          <div className="grid grid-cols-4 gap-2">
            {/* First Row */}
            <Button variant="clear" onClick={clear} className="col-span-2">
              <Delete className="w-5 h-5 mx-auto" />
            </Button>
            <Button onClick={() => performOperation('÷')} variant="operator">÷</Button>
            <Button onClick={() => performOperation('×')} variant="operator">×</Button>

            {/* Second Row */}
            <Button onClick={() => inputNumber('7')}>7</Button>
            <Button onClick={() => inputNumber('8')}>8</Button>
            <Button onClick={() => inputNumber('9')}>9</Button>
            <Button onClick={() => performOperation('-')} variant="operator">-</Button>

            {/* Third Row */}
            <Button onClick={() => inputNumber('4')}>4</Button>
            <Button onClick={() => inputNumber('5')}>5</Button>
            <Button onClick={() => inputNumber('6')}>6</Button>
            <Button onClick={() => performOperation('+')} variant="operator">+</Button>

            {/* Fourth Row */}
            <Button onClick={() => inputNumber('1')}>1</Button>
            <Button onClick={() => inputNumber('2')}>2</Button>
            <Button onClick={() => inputNumber('3')}>3</Button>
            <Button onClick={performCalculation} variant="equals" className="row-span-2">=</Button>

            {/* Fifth Row */}
            <Button onClick={() => inputNumber('0')} className="col-span-2">0</Button>
            <Button onClick={inputDecimal}>.</Button>
          </div>
        </div>

        {/* Memo Panel */}
        <div className="glass rounded-lg p-4 space-y-3" style={{ borderColor: '#22211A', borderWidth: '1px', borderStyle: 'solid', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: '#22211A' }}>
              メモ
            </h3>
            <button
              onClick={addMemoItem}
              className="flex items-center space-x-1 px-3 py-1 rounded-lg text-white text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#4abf79' }}
            >
              <Plus className="w-4 h-4" />
              <span>追加</span>
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 mb-2">
            <div className="col-span-5 text-sm font-medium" style={{ color: '#22211A' }}>
              項目
            </div>
            <div className="col-span-5 text-sm font-medium" style={{ color: '#22211A' }}>
              値
            </div>
            <div className="col-span-2 text-sm font-medium" style={{ color: '#22211A' }}>
              操作
            </div>
          </div>

          {/* Memo Items */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {memoItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => updateMemoItem(item.id, 'item', e.target.value)}
                  className="col-span-5 px-2 py-1 border border-gray-300 rounded text-sm"
                  style={{ color: '#22211A' }}
                  placeholder="項目名"
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => updateMemoItem(item.id, 'value', e.target.value)}
                  className="col-span-5 px-2 py-1 border border-gray-300 rounded text-sm"
                  style={{ color: '#22211A' }}
                  placeholder="値"
                />
                <button
                  onClick={() => deleteMemoItem(item.id)}
                  disabled={memoItems.length === 1}
                  className="col-span-2 flex items-center justify-center p-1 rounded text-white text-xs transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
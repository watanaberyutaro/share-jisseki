import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export interface EventDataForPDF {
  id: string
  venue: string
  agency_name: string
  start_date: string
  end_date: string
  year: number
  month: number
  week_number: number
  include_cellup_in_hs_total: boolean
  target_hs_total: number
  actual_hs_total: number
  actual_au_mnp: number
  actual_uq_mnp: number
  actual_au_new: number
  actual_uq_new: number
  actual_cellup: number
  staff_performances?: StaffPerformanceForPDF[]
  photos?: PhotoForPDF[]
  operation_details?: string
  preparation_details?: string
  promotion_method?: string
  success_case_1?: string
  success_case_2?: string
  challenges_and_solutions?: string
}

export interface StaffPerformanceForPDF {
  staff_name: string
  au_mnp: number
  uq_mnp: number
  au_new: number
  uq_new: number
  cellup: number
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
  daily_performances?: DailyPerformanceForPDF[]
}

export interface DailyPerformanceForPDF {
  day_number: number
  event_date: string
  au_mnp_sp1: number
  au_mnp_sp2: number
  au_mnp_sim: number
  uq_mnp_sp1: number
  uq_mnp_sp2: number
  uq_mnp_sim: number
  au_hs_sp1: number
  au_hs_sp2: number
  au_hs_sim: number
  uq_hs_sp1: number
  uq_hs_sp2: number
  uq_hs_sim: number
  cell_up_sp1: number
  cell_up_sp2: number
  cell_up_sim: number
  credit_card: number
  gold_card: number
  ji_bank_account: number
  warranty: number
  ott: number
  electricity: number
  gas: number
}

export interface PhotoForPDF {
  file_url: string
  description?: string
  created_at: string
}

export interface PDFPreviewData {
  previewContent: string
  downloadFunction: () => Promise<void>
  fileName: string
}

/**
 * イベント実績データのPDFプレビューデータを生成
 */
export async function generatePDFPreview(event: EventDataForPDF, includeDetails: boolean = false): Promise<PDFPreviewData> {
  const sections = generatePDFSections(event, includeDetails)

  // プレビュー用は全セクションを連結
  const previewContent = sections.map(s => s.html).join('')

  // ファイル名を安全に生成
  let dateStr = 'date'
  try {
    if (event.start_date) {
      const startDate = new Date(event.start_date)
      if (!isNaN(startDate.getTime())) {
        dateStr = format(startDate, 'yyyy-MM-dd', { locale: ja })
      }
    }
  } catch (error) {
    console.error('Filename date format error:', error)
  }

  const fileName = `イベント実績_${event.venue}_${dateStr}.pdf`

  const downloadFunction = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const padding = 10 // ページ余白

      let isFirstPage = true

      // 各セクションを個別にキャプチャしてPDFページとして追加
      for (const section of sections) {
        // 一時的なコンテナを作成
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.style.top = '0'
        container.style.width = '750px'
        container.style.padding = '30px'
        container.style.backgroundColor = '#FFFFFF'
        container.style.fontFamily = 'sans-serif'
        document.body.appendChild(container)

        // セクションのHTMLを設定
        container.innerHTML = section.html

        // セクションをキャプチャ
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF'
        })

        // コンテナを削除
        document.body.removeChild(container)

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = pdfWidth - (padding * 2)
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // 新しいページを追加（最初のページ以外）
        if (!isFirstPage) {
          pdf.addPage()
        }

        // 画像をPDFに追加
        pdf.addImage(imgData, 'PNG', padding, padding, imgWidth, imgHeight)
        isFirstPage = false
      }

      // PDFをダウンロード
      pdf.save(fileName)
    } catch (error) {
      console.error('PDF export error:', error)
      throw new Error('PDFのエクスポートに失敗しました')
    }
  }

  return {
    previewContent,
    downloadFunction,
    fileName
  }
}

/**
 * イベント実績データをPDFとしてエクスポート（後方互換性のため残す）
 */
export async function exportEventToPDF(event: EventDataForPDF, includeDetails: boolean = false): Promise<void> {
  const { downloadFunction } = await generatePDFPreview(event, includeDetails)
  await downloadFunction()
}

/**
 * PDFセクションを生成（各ページ用）
 */
interface PDFSection {
  html: string
  type: 'main' | 'staff' | 'details'
}

function generatePDFSections(event: EventDataForPDF, includeDetails: boolean): PDFSection[] {
  const sections: PDFSection[] = []

  // セクション1: イベント実績レポート〜写真まで
  sections.push({
    html: generateMainSection(event, includeDetails),
    type: 'main'
  })

  // セクション2〜N: 各スタッフ
  if (includeDetails && event.staff_performances && event.staff_performances.length > 0) {
    event.staff_performances.forEach((staff, index) => {
      sections.push({
        html: generateStaffSection(staff, index === 0),
        type: 'staff'
      })
    })
  }

  // 最後のセクション: イベント詳細情報
  if (includeDetails) {
    const hasDetails = event.operation_details || event.preparation_details || event.promotion_method ||
                      event.success_case_1 || event.success_case_2 || event.challenges_and_solutions
    if (hasDetails) {
      sections.push({
        html: generateDetailsSection(event),
        type: 'details'
      })
    }
  }

  return sections
}

/**
 * メインセクション（1ページ目）のHTMLを生成
 */
function generateMainSection(event: EventDataForPDF, includeDetails: boolean): string {
  const eventDays = calculateEventDays(event.start_date, event.end_date)
  const achievementRate = event.target_hs_total > 0
    ? Math.round((event.actual_hs_total / event.target_hs_total) * 100)
    : 0

  // 日付を安全にフォーマット
  let startDateStr = '開始日'
  let endDateStr = '終了日'
  try {
    if (event.start_date) {
      const startDate = new Date(event.start_date)
      if (!isNaN(startDate.getTime())) {
        startDateStr = format(startDate, 'yyyy年M月d日', { locale: ja })
      }
    }
    if (event.end_date) {
      const endDate = new Date(event.end_date)
      if (!isNaN(endDate.getTime())) {
        endDateStr = format(endDate, 'M月d日', { locale: ja })
      }
    }
  } catch (error) {
    console.error('Header date format error:', error)
  }

  let html = `
    <div style="color: #22211A; line-height: 1.4;">
      <!-- ヘッダー -->
      <div style="border-bottom: 1px solid #22211A; padding-bottom: 8px; margin-bottom: 12px;">
        <h1 style="font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #22211A;">
          イベント実績レポート
        </h1>
        <div style="font-size: 9px; color: #22211A;">
          <div style="margin-bottom: 4px;">
            <strong>期間:</strong> ${startDateStr} 〜 ${endDateStr} (${eventDays}日間)
          </div>
          <div style="margin-bottom: 4px;">
            <strong>会場:</strong> ${event.venue}
          </div>
          <div>
            <strong>代理店:</strong> ${event.agency_name}
          </div>
        </div>
      </div>

      <!-- 実績サマリー -->
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 11px; font-weight: bold; margin: 0 0 6px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 3px;">
          実績サマリー
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 5px;">
          <div style="background-color: #F5F5F5; padding: 5px; border-radius: 3px; text-align: center;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px; color: #22211A;">
              ${event.actual_hs_total}
            </div>
            <div style="font-size: 8px; color: #22211A; margin-bottom: 2px;">実績HS総販</div>
            <div style="font-size: 7px; background-color: ${event.include_cellup_in_hs_total ? '#4abf79' : '#9E9E9E'}; color: #FFFFFF; padding: 2px 6px; border-radius: 3px; display: inline-block; line-height: 1.2;">
              ${event.include_cellup_in_hs_total ? 'セルアップ含む' : 'セルアップ含まない'}
            </div>
            ${event.target_hs_total > 0 ? `
              <div style="font-size: 7px; margin-top: 2px; color: #22211A;">
                目標: ${event.target_hs_total}
              </div>
            ` : ''}
          </div>
          <div style="background-color: #F5F5F5; padding: 5px; border-radius: 3px; text-align: center;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px; color: #22211A;">
              ${event.actual_au_mnp + event.actual_uq_mnp}
            </div>
            <div style="font-size: 8px; color: #22211A;">MNP合計</div>
          </div>
          <div style="background-color: #F5F5F5; padding: 5px; border-radius: 3px; text-align: center;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px; color: #22211A;">
              ${event.actual_au_new + event.actual_uq_new}
            </div>
            <div style="font-size: 8px; color: #22211A;">新規合計</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">
          <div style="background-color: #F5F5F5; padding: 5px; border-radius: 3px; text-align: center;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px; color: #22211A;">
              ${event.actual_cellup || 0}
            </div>
            <div style="font-size: 8px; color: #22211A;">セルアップ</div>
          </div>
          <div style="background-color: #FFF9E6; padding: 5px; border-radius: 3px; text-align: center;">
            <div style="font-size: 15px; font-weight: bold; margin-bottom: 2px; color: #FFB300;">
              ${achievementRate}%
            </div>
            <div style="font-size: 8px; color: #22211A;">達成率</div>
          </div>
        </div>
      </div>

      <!-- 詳細実績 -->
      <div style="margin-bottom: 12px;">
        <h2 style="font-size: 11px; font-weight: bold; margin: 0 0 6px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 3px;">
          詳細実績
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 4px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">au MNP</td>
            <td style="padding: 4px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_au_mnp}件</td>
          </tr>
          <tr>
            <td style="padding: 4px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">UQ MNP</td>
            <td style="padding: 4px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_uq_mnp}件</td>
          </tr>
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 4px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">au 新規</td>
            <td style="padding: 4px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_au_new}件</td>
          </tr>
          <tr>
            <td style="padding: 4px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">UQ 新規</td>
            <td style="padding: 4px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_uq_new}件</td>
          </tr>
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 4px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">セルアップ</td>
            <td style="padding: 4px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_cellup || 0}件</td>
          </tr>
        </table>
      </div>
  `

  // 写真を含める場合
  if (includeDetails && event.photos && event.photos.length > 0) {
    html += `
      <div style="margin-bottom: 12px;">
        <h2 style="font-size: 11px; font-weight: bold; margin: 0 0 6px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 3px;">
          イベント写真 (${event.photos.length}枚)
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
    `

    event.photos.forEach((photo, index) => {
      let photoDate = ''
      try {
        if (photo.created_at) {
          const createdDate = new Date(photo.created_at)
          if (!isNaN(createdDate.getTime())) {
            photoDate = format(createdDate, 'yyyy/MM/dd HH:mm', { locale: ja })
          }
        }
      } catch (error) {
        console.error('Photo date format error:', error)
      }

      html += `
        <div style="background-color: #F9F9F9; border-radius: 4px; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <img src="${photo.file_url}" alt="イベント写真 ${index + 1}" style="max-width: 100%; max-height: 150px; height: auto; width: auto; border-radius: 3px; margin-bottom: 4px; object-fit: contain;" crossorigin="anonymous" />
          ${photoDate ? `<div style="font-size: 7px; color: #666; margin-top: 3px;">${photoDate}</div>` : ''}
        </div>
      `
    })

    html += `
        </div>
      </div>
    `
  }

  html += `</div>`
  return html
}

/**
 * スタッフセクションのHTMLを生成
 */
function generateStaffSection(staff: StaffPerformanceForPDF, showTitle: boolean): string {
  const ltvTotal = (staff.credit_card || 0) + (staff.gold_card || 0) + (staff.ji_bank_account || 0) +
                  (staff.warranty || 0) + (staff.ott || 0) + (staff.electricity || 0) + (staff.gas || 0)

  let html = `
    <div style="color: #22211A; line-height: 1.3; padding: 8px; background-color: #F9F9F9; border-radius: 4px;">
      ${showTitle ? `<h2 style="font-size: 10px; font-weight: bold; margin: 0 0 6px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">スタッフ別実績</h2>` : ''}
      <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A; border-bottom: 1px solid #22211A; padding-bottom: 2px;">
        ${staff.staff_name}
      </h3>

      <!-- 集計サマリー -->
      <div style="margin-bottom: 5px;">
        <h4 style="font-size: 8px; font-weight: bold; margin: 0 0 3px 0; color: #22211A;">実績サマリー</h4>
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; font-size: 7px; margin-bottom: 3px;">
          <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>au MNP</strong><br/>${staff.au_mnp || 0}件
          </div>
          <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>UQ MNP</strong><br/>${staff.uq_mnp || 0}件
          </div>
          <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>au 新規</strong><br/>${staff.au_new || 0}件
          </div>
          <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>UQ 新規</strong><br/>${staff.uq_new || 0}件
          </div>
          <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>セルアップ</strong><br/>${staff.cellup || 0}件
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; font-size: 7px;">
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>クレカ:</strong> ${staff.credit_card || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>ゴールド:</strong> ${staff.gold_card || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>じぶん銀:</strong> ${staff.ji_bank_account || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>保証:</strong> ${staff.warranty || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>OTT:</strong> ${staff.ott || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>電気:</strong> ${staff.electricity || 0}
          </div>
          <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
            <strong>ガス:</strong> ${staff.gas || 0}
          </div>
          <div style="background-color: #FFE0B2; padding: 3px; border-radius: 2px; text-align: center; font-weight: bold;">
            <strong>LTV計:</strong> ${ltvTotal}
          </div>
        </div>
      </div>
  `

  // 日別実績がある場合
  if (staff.daily_performances && staff.daily_performances.length > 0) {
    html += `
      <div style="margin-top: 5px;">
        <h4 style="font-size: 8px; font-weight: bold; margin: 0 0 3px 0; color: #22211A;">日別実績詳細</h4>
    `

    const sortedDaily = [...staff.daily_performances].sort((a, b) => a.day_number - b.day_number)

    sortedDaily.forEach((daily) => {
      const auMnp = (daily.au_mnp_sp1 || 0) + (daily.au_mnp_sp2 || 0) + (daily.au_mnp_sim || 0)
      const uqMnp = (daily.uq_mnp_sp1 || 0) + (daily.uq_mnp_sp2 || 0) + (daily.uq_mnp_sim || 0)
      const auNew = (daily.au_hs_sp1 || 0) + (daily.au_hs_sp2 || 0) + (daily.au_hs_sim || 0)
      const uqNew = (daily.uq_hs_sp1 || 0) + (daily.uq_hs_sp2 || 0) + (daily.uq_hs_sim || 0)
      const cellup = (daily.cell_up_sp1 || 0) + (daily.cell_up_sp2 || 0) + (daily.cell_up_sim || 0)
      const dailyLtv = (daily.credit_card || 0) + (daily.gold_card || 0) + (daily.ji_bank_account || 0) +
                      (daily.warranty || 0) + (daily.ott || 0) + (daily.electricity || 0) + (daily.gas || 0)
      const hsTotal = auMnp + uqMnp + auNew + uqNew + cellup

      let dateDisplay = `${daily.day_number}日目`
      try {
        if (daily.event_date) {
          const eventDate = new Date(daily.event_date)
          if (!isNaN(eventDate.getTime())) {
            dateDisplay = `${daily.day_number}日目 - ${format(eventDate, 'M月d日（E）', { locale: ja })}`
          }
        }
      } catch (error) {
        console.error('Date format error:', error)
      }

      html += `
        <div style="background-color: #FAFAFA; border: 1px solid #E0E0E0; border-radius: 4px; padding: 6px; margin-bottom: 6px;">
          <div style="font-size: 9px; font-weight: bold; margin-bottom: 4px; color: #22211A;">
            ${dateDisplay}
            <span style="color: #FFB300; margin-left: 8px;">HS: ${hsTotal}件 / LTV: ${dailyLtv}件</span>
          </div>
          <table style="width: 100%; font-size: 8px; border-collapse: collapse;">
            <tr style="background-color: #E3F2FD;">
              <th style="padding: 3px; border: 1px solid #DDD; text-align: center;">項目</th>
              <th style="padding: 3px; border: 1px solid #DDD; text-align: center;">SP1</th>
              <th style="padding: 3px; border: 1px solid #DDD; text-align: center;">SP2</th>
              <th style="padding: 3px; border: 1px solid #DDD; text-align: center;">SIM</th>
              <th style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2;">計</th>
            </tr>
            <tr>
              <td style="padding: 3px; border: 1px solid #DDD; font-weight: bold;">au MNP</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sp1 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sp2 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sim || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${auMnp}</td>
            </tr>
            <tr>
              <td style="padding: 3px; border: 1px solid #DDD; font-weight: bold;">UQ MNP</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sp1 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sp2 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sim || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${uqMnp}</td>
            </tr>
            <tr>
              <td style="padding: 3px; border: 1px solid #DDD; font-weight: bold;">au 新規</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sp1 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sp2 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sim || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${auNew}</td>
            </tr>
            <tr>
              <td style="padding: 3px; border: 1px solid #DDD; font-weight: bold;">UQ 新規</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sp1 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sp2 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sim || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${uqNew}</td>
            </tr>
            <tr>
              <td style="padding: 3px; border: 1px solid #DDD; font-weight: bold;">セルアップ</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sp1 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sp2 || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sim || 0}</td>
              <td style="padding: 3px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${cellup}</td>
            </tr>
          </table>
          <div style="margin-top: 4px; font-size: 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px;">
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">クレカ: ${daily.credit_card || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">金カード: ${daily.gold_card || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">じぶん銀: ${daily.ji_bank_account || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">保証: ${daily.warranty || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">OTT: ${daily.ott || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">電気: ${daily.electricity || 0}</div>
            <div style="background-color: #F1F8E9; padding: 3px; border-radius: 2px; text-align: center;">ガス: ${daily.gas || 0}</div>
          </div>
        </div>
      `
    })

    html += `</div>`
  }

  html += `</div>`
  return html
}

/**
 * 詳細情報セクションのHTMLを生成
 */
function generateDetailsSection(event: EventDataForPDF): string {
  let html = `
    <div style="color: #22211A; line-height: 1.4;">
      <h2 style="font-size: 11px; font-weight: bold; margin: 0 0 10px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 3px;">
        イベント詳細情報
      </h2>
  `

  if (event.operation_details) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">運用詳細</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.operation_details)}
        </div>
      </div>
    `
  }

  if (event.preparation_details) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">準備詳細</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.preparation_details)}
        </div>
      </div>
    `
  }

  if (event.promotion_method) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">宣伝方法</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.promotion_method)}
        </div>
      </div>
    `
  }

  if (event.success_case_1) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">成功事例 1</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.success_case_1)}
        </div>
      </div>
    `
  }

  if (event.success_case_2) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">成功事例 2</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.success_case_2)}
        </div>
      </div>
    `
  }

  if (event.challenges_and_solutions) {
    html += `
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A;">課題と解決策</h3>
        <div style="background-color: #F5F5F5; padding: 8px; border-radius: 4px; white-space: pre-wrap; font-size: 9px; line-height: 1.5;">
          ${escapeHtml(event.challenges_and_solutions)}
        </div>
      </div>
    `
  }

  html += `</div>`
  return html
}

/**
 * PDFコンテンツのHTMLを生成（後方互換性のため残す）
 */
function generatePDFContent(event: EventDataForPDF, includeDetails: boolean): string {
  const eventDays = calculateEventDays(event.start_date, event.end_date)
  const achievementRate = event.target_hs_total > 0
    ? Math.round((event.actual_hs_total / event.target_hs_total) * 100)
    : 0

  // 日付を安全にフォーマット
  let startDateStr = '開始日'
  let endDateStr = '終了日'
  try {
    if (event.start_date) {
      const startDate = new Date(event.start_date)
      if (!isNaN(startDate.getTime())) {
        startDateStr = format(startDate, 'yyyy年M月d日', { locale: ja })
      }
    }
    if (event.end_date) {
      const endDate = new Date(event.end_date)
      if (!isNaN(endDate.getTime())) {
        endDateStr = format(endDate, 'M月d日', { locale: ja })
      }
    }
  } catch (error) {
    console.error('Header date format error:', error)
  }

  let html = `
    <div style="color: #22211A; line-height: 1.3;">
      <!-- ヘッダー -->
      <div style="border-bottom: 1px solid #22211A; padding-bottom: 6px; margin-bottom: 10px;">
        <h1 style="font-size: 14px; font-weight: bold; margin: 0 0 6px 0; color: #22211A;">
          イベント実績レポート
        </h1>
        <div style="font-size: 8px; color: #22211A;">
          <div style="margin-bottom: 3px;">
            <strong>期間:</strong> ${startDateStr} 〜 ${endDateStr} (${eventDays}日間)
          </div>
          <div style="margin-bottom: 3px;">
            <strong>会場:</strong> ${event.venue}
          </div>
          <div>
            <strong>代理店:</strong> ${event.agency_name}
          </div>
        </div>
      </div>

      <!-- 実績サマリー -->
      <div style="margin-bottom: 8px;">
        <h2 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">
          実績サマリー
        </h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 4px;">
          <div style="background-color: #F5F5F5; padding: 4px; border-radius: 3px; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 1px; color: #22211A;">
              ${event.actual_hs_total}
            </div>
            <div style="font-size: 7px; color: #22211A; margin-bottom: 1px;">実績HS総販</div>
            <div style="font-size: 6px; background-color: ${event.include_cellup_in_hs_total ? '#4abf79' : '#9E9E9E'}; color: #FFFFFF; padding: 1px 3px; border-radius: 2px; display: inline-block;">
              ${event.include_cellup_in_hs_total ? 'セルアップ含む' : 'セルアップ含まない'}
            </div>
            ${event.target_hs_total > 0 ? `
              <div style="font-size: 6px; margin-top: 1px; color: #22211A;">
                目標: ${event.target_hs_total}
              </div>
            ` : ''}
          </div>
          <div style="background-color: #F5F5F5; padding: 4px; border-radius: 3px; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 1px; color: #22211A;">
              ${event.actual_au_mnp + event.actual_uq_mnp}
            </div>
            <div style="font-size: 7px; color: #22211A;">MNP合計</div>
          </div>
          <div style="background-color: #F5F5F5; padding: 4px; border-radius: 3px; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 1px; color: #22211A;">
              ${event.actual_au_new + event.actual_uq_new}
            </div>
            <div style="font-size: 7px; color: #22211A;">新規合計</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px;">
          <div style="background-color: #F5F5F5; padding: 4px; border-radius: 3px; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 1px; color: #22211A;">
              ${event.actual_cellup || 0}
            </div>
            <div style="font-size: 7px; color: #22211A;">セルアップ</div>
          </div>
          <div style="background-color: #FFF9E6; padding: 4px; border-radius: 3px; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; margin-bottom: 1px; color: #FFB300;">
              ${achievementRate}%
            </div>
            <div style="font-size: 7px; color: #22211A;">達成率</div>
          </div>
        </div>
      </div>

      <!-- 詳細実績 -->
      <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
        <h2 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">
          詳細実績
        </h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 8px; page-break-inside: avoid; break-inside: avoid;">
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 3px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">au MNP</td>
            <td style="padding: 3px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_au_mnp}件</td>
          </tr>
          <tr>
            <td style="padding: 3px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">UQ MNP</td>
            <td style="padding: 3px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_uq_mnp}件</td>
          </tr>
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 3px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">au 新規</td>
            <td style="padding: 3px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_au_new}件</td>
          </tr>
          <tr>
            <td style="padding: 3px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">UQ 新規</td>
            <td style="padding: 3px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_uq_new}件</td>
          </tr>
          <tr style="background-color: #F5F5F5;">
            <td style="padding: 3px; border: 1px solid #E0E0E0; font-weight: bold; color: #22211A;">セルアップ</td>
            <td style="padding: 3px; border: 1px solid #E0E0E0; text-align: right; color: #22211A;">${event.actual_cellup || 0}件</td>
          </tr>
        </table>
      </div>
  `

  // 写真を含める場合
  if (includeDetails && event.photos && event.photos.length > 0) {
    html += `
      <div style="margin-bottom: 10px;">
        <h2 style="font-size: 10px; font-weight: bold; margin: 0 0 5px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">
          イベント写真 (${event.photos.length}枚)
        </h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px;">
    `

    event.photos.forEach((photo, index) => {
      // 日付を安全にフォーマット
      let photoDate = ''
      try {
        if (photo.created_at) {
          const createdDate = new Date(photo.created_at)
          if (!isNaN(createdDate.getTime())) {
            photoDate = format(createdDate, 'yyyy/MM/dd HH:mm', { locale: ja })
          }
        }
      } catch (error) {
        console.error('Photo date format error:', error)
      }

      html += `
        <div style="background-color: #F9F9F9; border-radius: 3px; padding: 4px; text-align: center; page-break-inside: avoid; break-inside: avoid;">
          <img src="${photo.file_url}" alt="イベント写真 ${index + 1}" style="width: 100%; height: 120px; border-radius: 3px; margin-bottom: 3px; object-fit: contain;" crossorigin="anonymous" />
          ${photoDate ? `<div style="font-size: 6px; color: #666; margin-top: 2px;">${photoDate}</div>` : ''}
        </div>
      `
    })

    html += `
        </div>
      </div>
    `
  }

  // スタッフ実績を含める場合
  if (includeDetails && event.staff_performances && event.staff_performances.length > 0) {
    event.staff_performances.forEach((staff, index) => {
      const ltvTotal = (staff.credit_card || 0) + (staff.gold_card || 0) + (staff.ji_bank_account || 0) +
                      (staff.warranty || 0) + (staff.ott || 0) + (staff.electricity || 0) + (staff.gas || 0)

      // 最初のスタッフは新しいページから、2人目以降も必ず新しいページから開始
      html += `
        <div style="padding: 8px; background-color: #F9F9F9; border-radius: 4px; page-break-before: always; break-before: page; page-break-inside: avoid; break-inside: avoid;">
          ${index === 0 ? `<h2 style="font-size: 10px; font-weight: bold; margin: 0 0 8px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">スタッフ別実績</h2>` : ''}
          <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 5px 0; color: #22211A; border-bottom: 1px solid #22211A; padding-bottom: 2px;">
            ${staff.staff_name}
          </h3>

          <!-- 集計サマリー -->
          <div style="margin-bottom: 6px; page-break-inside: avoid; break-inside: avoid;">
            <h4 style="font-size: 8px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">実績サマリー</h4>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; font-size: 7px; margin-bottom: 3px; page-break-inside: avoid; break-inside: avoid;">
              <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>au MNP</strong><br/>${staff.au_mnp || 0}件
              </div>
              <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>UQ MNP</strong><br/>${staff.uq_mnp || 0}件
              </div>
              <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>au 新規</strong><br/>${staff.au_new || 0}件
              </div>
              <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>UQ 新規</strong><br/>${staff.uq_new || 0}件
              </div>
              <div style="background-color: #E8F5E9; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>セルアップ</strong><br/>${staff.cellup || 0}件
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; font-size: 7px; page-break-inside: avoid; break-inside: avoid;">
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>クレカ:</strong> ${staff.credit_card || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>ゴールド:</strong> ${staff.gold_card || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>じぶん銀:</strong> ${staff.ji_bank_account || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>保証:</strong> ${staff.warranty || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>OTT:</strong> ${staff.ott || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>電気:</strong> ${staff.electricity || 0}
              </div>
              <div style="background-color: #FFF9E6; padding: 3px; border-radius: 2px; text-align: center;">
                <strong>ガス:</strong> ${staff.gas || 0}
              </div>
              <div style="background-color: #FFE0B2; padding: 3px; border-radius: 2px; text-align: center; font-weight: bold;">
                <strong>LTV計:</strong> ${ltvTotal}
              </div>
            </div>
          </div>
      `

      // 日別実績がある場合
      if (staff.daily_performances && staff.daily_performances.length > 0) {
        html += `
          <div style="margin-top: 6px;">
            <h4 style="font-size: 8px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">日別実績詳細</h4>
        `

        const sortedDaily = [...staff.daily_performances].sort((a, b) => a.day_number - b.day_number)

        sortedDaily.forEach((daily) => {
          const auMnp = (daily.au_mnp_sp1 || 0) + (daily.au_mnp_sp2 || 0) + (daily.au_mnp_sim || 0)
          const uqMnp = (daily.uq_mnp_sp1 || 0) + (daily.uq_mnp_sp2 || 0) + (daily.uq_mnp_sim || 0)
          const auNew = (daily.au_hs_sp1 || 0) + (daily.au_hs_sp2 || 0) + (daily.au_hs_sim || 0)
          const uqNew = (daily.uq_hs_sp1 || 0) + (daily.uq_hs_sp2 || 0) + (daily.uq_hs_sim || 0)
          const cellup = (daily.cell_up_sp1 || 0) + (daily.cell_up_sp2 || 0) + (daily.cell_up_sim || 0)
          const dailyLtv = (daily.credit_card || 0) + (daily.gold_card || 0) + (daily.ji_bank_account || 0) +
                          (daily.warranty || 0) + (daily.ott || 0) + (daily.electricity || 0) + (daily.gas || 0)
          const hsTotal = auMnp + uqMnp + auNew + uqNew + cellup

          // 日付を安全にフォーマット
          let dateDisplay = `${daily.day_number}日目`
          try {
            if (daily.event_date) {
              const eventDate = new Date(daily.event_date)
              if (!isNaN(eventDate.getTime())) {
                dateDisplay = `${daily.day_number}日目 - ${format(eventDate, 'M月d日（E）', { locale: ja })}`
              }
            }
          } catch (error) {
            console.error('Date format error:', error)
          }

          html += `
            <div style="background-color: #FAFAFA; border: 1px solid #E0E0E0; border-radius: 4px; padding: 5px; margin-bottom: 5px; page-break-inside: avoid; break-inside: avoid;">
              <div style="font-size: 8px; font-weight: bold; margin-bottom: 3px; color: #22211A;">
                ${dateDisplay}
                <span style="color: #FFB300; margin-left: 6px;">HS: ${hsTotal}件 / LTV: ${dailyLtv}件</span>
              </div>
              <table style="width: 100%; font-size: 7px; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid;">
                <tr style="background-color: #E3F2FD;">
                  <th style="padding: 2px; border: 1px solid #DDD; text-align: center;">項目</th>
                  <th style="padding: 2px; border: 1px solid #DDD; text-align: center;">SP1</th>
                  <th style="padding: 2px; border: 1px solid #DDD; text-align: center;">SP2</th>
                  <th style="padding: 2px; border: 1px solid #DDD; text-align: center;">SIM</th>
                  <th style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2;">計</th>
                </tr>
                <tr>
                  <td style="padding: 2px; border: 1px solid #DDD; font-weight: bold;">au MNP</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sp1 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sp2 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_mnp_sim || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${auMnp}</td>
                </tr>
                <tr>
                  <td style="padding: 2px; border: 1px solid #DDD; font-weight: bold;">UQ MNP</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sp1 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sp2 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_mnp_sim || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${uqMnp}</td>
                </tr>
                <tr>
                  <td style="padding: 2px; border: 1px solid #DDD; font-weight: bold;">au 新規</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sp1 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sp2 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.au_hs_sim || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${auNew}</td>
                </tr>
                <tr>
                  <td style="padding: 2px; border: 1px solid #DDD; font-weight: bold;">UQ 新規</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sp1 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sp2 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.uq_hs_sim || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${uqNew}</td>
                </tr>
                <tr>
                  <td style="padding: 2px; border: 1px solid #DDD; font-weight: bold;">セルアップ</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sp1 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sp2 || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center;">${daily.cell_up_sim || 0}</td>
                  <td style="padding: 2px; border: 1px solid #DDD; text-align: center; background-color: #FFE0B2; font-weight: bold;">${cellup}</td>
                </tr>
              </table>
              <div style="margin-top: 3px; font-size: 7px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; page-break-inside: avoid; break-inside: avoid;">
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">クレカ: ${daily.credit_card || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">金カード: ${daily.gold_card || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">じぶん銀: ${daily.ji_bank_account || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">保証: ${daily.warranty || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">OTT: ${daily.ott || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">電気: ${daily.electricity || 0}</div>
                <div style="background-color: #F1F8E9; padding: 2px; border-radius: 2px; text-align: center;">ガス: ${daily.gas || 0}</div>
              </div>
            </div>
          `
        })

        html += `</div>`
      }

      html += `</div>`
    })
  }

  // イベント詳細情報を含める場合
  if (includeDetails) {
    const hasDetails = event.operation_details || event.preparation_details || event.promotion_method ||
                      event.success_case_1 || event.success_case_2 || event.challenges_and_solutions

    if (hasDetails) {
      html += `
        <div style="page-break-before: always; break-before: page;">
          <h2 style="font-size: 10px; font-weight: bold; margin: 0 0 8px 0; color: #22211A; border-bottom: 1px solid #FFB300; padding-bottom: 2px;">
            イベント詳細情報
          </h2>
      `

      if (event.operation_details) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">運用詳細</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.operation_details)}
            </div>
          </div>
        `
      }

      if (event.preparation_details) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">準備詳細</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.preparation_details)}
            </div>
          </div>
        `
      }

      if (event.promotion_method) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">宣伝方法</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.promotion_method)}
            </div>
          </div>
        `
      }

      if (event.success_case_1) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">成功事例 1</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.success_case_1)}
            </div>
          </div>
        `
      }

      if (event.success_case_2) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">成功事例 2</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.success_case_2)}
            </div>
          </div>
        `
      }

      if (event.challenges_and_solutions) {
        html += `
          <div style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
            <h3 style="font-size: 9px; font-weight: bold; margin: 0 0 4px 0; color: #22211A;">課題と解決策</h3>
            <div style="background-color: #F5F5F5; padding: 6px; border-radius: 3px; white-space: pre-wrap; font-size: 8px; line-height: 1.4;">
              ${escapeHtml(event.challenges_and_solutions)}
            </div>
          </div>
        `
      }

      html += `</div>`
    }
  }

  html += `</div>`
  return html
}

/**
 * イベント日数を計算
 */
function calculateEventDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

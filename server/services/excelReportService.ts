import ExcelJS from 'exceljs';

export interface OrderReportRow {
  orderNumber: string;
  createdAt: string | Date;
  sede: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  acceptedBy: string;
  preparedBy: string;
  productsDetail: string;
}

export interface GenerateExcelReportOptions {
  businessName?: string;
  branchName?: string;
  generatedBy?: string;
}

export const generateSalesReportExcel = async (
  rows: OrderReportRow[],
  options: GenerateExcelReportOptions = {}
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.businessName || 'Maracumango Neiva';
  workbook.lastModifiedBy = options.generatedBy || 'Administrador Maracumango';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Reporte de Ventas', {
    properties: { defaultRowHeight: 20 },
    views: [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: 8, // Freezes rows 1 through 8 (Headers remain visible while scrolling data)
      },
    ],
  });

  const businessName = options.businessName || 'Maracumango — Granizados & Micheladas';
  const branchText = options.branchName || 'Todas las Sedes (Consolidado)';
  const now = new Date();
  const generationDateFormatted = now.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // KPI Calculations strictly from included records
  const totalOrdersCount = rows.length;
  const totalSales = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const averageTicket = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;

  // Palette: Maracumango Deep Botanical Greens & Clean Neutrals
  const BRAND_DEEP_GREEN = 'FF2D6A00'; // Primary dark green
  const BRAND_LIGHT_GREEN = 'FFE8F3DC'; // Header subtitle background
  const KPI_BOX_BG = 'FFF3F6ED'; // Metric cards background
  const ZEBRA_ROW_EVEN = 'FFFFFFFF'; // White
  const ZEBRA_ROW_ODD = 'FFF8FAF5'; // Soft subtle mint
  const BORDER_COLOR = 'FFE1E4DA'; // Clean subtle border
  const DARK_TEXT = 'FF1A1C19';
  const MUTED_TEXT = 'FF555A50';

  const subtleBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  };

  // --- ROW 1: Subtle Top Accent Margin ---
  worksheet.getRow(1).height = 10;

  // --- ROW 2: Document Main Title ---
  worksheet.mergeCells('A2:O2');
  const titleCell = worksheet.getCell('A2');
  titleCell.value = `REPORTE DE VENTAS — ${businessName.toUpperCase()}`;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BRAND_DEEP_GREEN },
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 36;

  // --- ROW 3: Document Metadata Subtitle ---
  worksheet.mergeCells('A3:O3');
  const metaCell = worksheet.getCell('A3');
  metaCell.value = `Sede: ${branchText}  |  Fecha de Generación: ${generationDateFormatted}  |  Moneda: COP ($)`;
  metaCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: DARK_TEXT } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: BRAND_LIGHT_GREEN },
  };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 22;

  // --- ROW 4: Spacer ---
  worksheet.getRow(4).height = 12;

  // --- ROW 5 & 6: Sales Summary (KPI Cards) ---
  // Card 1: Total Pedidos (B5:D6)
  worksheet.mergeCells('B5:D5');
  const kpiLabel1 = worksheet.getCell('B5');
  kpiLabel1.value = 'CANTIDAD TOTAL DE PEDIDOS';
  kpiLabel1.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiLabel1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B6:D6');
  const kpiVal1 = worksheet.getCell('B6');
  kpiVal1.value = totalOrdersCount;
  kpiVal1.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiVal1.alignment = { horizontal: 'center', vertical: 'middle' };
  kpiVal1.numFmt = '#,##0';

  // Card 2: Total Ventas (F5:I6)
  worksheet.mergeCells('F5:I5');
  const kpiLabel2 = worksheet.getCell('F5');
  kpiLabel2.value = 'TOTAL VENTAS REGISTRADAS (COP)';
  kpiLabel2.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiLabel2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('F6:I6');
  const kpiVal2 = worksheet.getCell('F6');
  kpiVal2.value = totalSales;
  kpiVal2.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiVal2.alignment = { horizontal: 'center', vertical: 'middle' };
  kpiVal2.numFmt = '"$"#,##0';

  // Card 3: Promedio de Venta (K5:N6)
  worksheet.mergeCells('K5:N5');
  const kpiLabel3 = worksheet.getCell('K5');
  kpiLabel3.value = 'PROMEDIO DE VENTA POR PEDIDO';
  kpiLabel3.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiLabel3.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('K6:N6');
  const kpiVal3 = worksheet.getCell('K6');
  kpiVal3.value = averageTicket;
  kpiVal3.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: KPI_BOX_BG } };
  kpiVal3.alignment = { horizontal: 'center', vertical: 'middle' };
  kpiVal3.numFmt = '"$"#,##0';

  // Apply borders to KPI Card cells
  const borderCols = [
    ['B', 'C', 'D'],
    ['F', 'G', 'H', 'I'],
    ['K', 'L', 'M', 'N'],
  ];
  borderCols.forEach((colGroup) => {
    colGroup.forEach((col) => {
      worksheet.getCell(`${col}5`).border = subtleBorder;
      worksheet.getCell(`${col}6`).border = subtleBorder;
    });
  });

  worksheet.getRow(5).height = 18;
  worksheet.getRow(6).height = 28;

  // --- ROW 7: Spacer ---
  worksheet.getRow(7).height = 12;

  // --- ROW 8: Table Headers ---
  const headers = [
    'Número Pedido',
    'Fecha y Hora',
    'Sede Operativa',
    'Cliente',
    'Teléfono',
    'Tipo Entrega',
    'Dirección',
    'Método Pago',
    'Subtotal (COP)',
    'Tarifa Domicilio (COP)',
    'Total (COP)',
    'Estado',
    'Aprobado Por',
    'Preparado Por',
    'Detalle de Productos',
  ];

  const headerRow = worksheet.getRow(8);
  headerRow.height = 30;

  headers.forEach((h, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_DEEP_GREEN },
    };
    cell.alignment = {
      horizontal: [9, 10, 11].includes(colNumber) ? 'right' : 'center',
      vertical: 'middle',
      wrapText: false,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: BRAND_DEEP_GREEN } },
      bottom: { style: 'medium', color: { argb: BRAND_DEEP_GREEN } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    };
  });

  // Enable AutoFilter across all 15 columns
  worksheet.autoFilter = 'A8:O8';

  // --- ROWS 9+: Data Rows ---
  let currentRowIndex = 9;

  for (const r of rows) {
    const row = worksheet.getRow(currentRowIndex);
    const isOdd = (currentRowIndex - 9) % 2 === 1;
    const rowFillColor = isOdd ? ZEBRA_ROW_ODD : ZEBRA_ROW_EVEN;

    // Format Date uniformly
    let dateStr = '—';
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    // Preserve phone numbers strictly as text
    const phoneStr = r.customerPhone ? String(r.customerPhone).trim() : '—';

    // Cell values
    row.getCell(1).value = r.orderNumber || '—';
    row.getCell(2).value = dateStr;
    row.getCell(3).value = r.sede || 'Principal';
    row.getCell(4).value = r.customerName || 'Cliente';
    row.getCell(5).value = phoneStr;
    row.getCell(6).value = r.deliveryMethod === 'domicilio' ? 'Domicilio' : 'Recoger en Tienda';
    row.getCell(7).value = r.deliveryAddress || 'En tienda';
    row.getCell(8).value = (r.paymentMethod || 'Efectivo').toUpperCase();
    row.getCell(9).value = Number(r.subtotal) || 0;
    row.getCell(10).value = Number(r.deliveryFee) || 0;
    row.getCell(11).value = Number(r.total) || 0;
    row.getCell(12).value = r.status || 'Completado';
    row.getCell(13).value = r.acceptedBy || '—';
    row.getCell(14).value = r.preparedBy || '—';
    row.getCell(15).value = r.productsDetail || '—';

    // Number & Currency formatting (COP with thousands separator)
    row.getCell(9).numFmt = '"$"#,##0';
    row.getCell(10).numFmt = '"$"#,##0';
    row.getCell(11).numFmt = '"$"#,##0';

    // Phone cell as explicit Text format
    row.getCell(5).numFmt = '@';

    // Alignments & Styles per column
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: BRAND_DEEP_GREEN } };

    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(4).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: DARK_TEXT } };

    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(11).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: BRAND_DEEP_GREEN } };

    row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(15).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // Set font size and zebra background on all 15 columns
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      if (!cell.font) {
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: DARK_TEXT } };
      }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowFillColor },
      };
      cell.border = subtleBorder;
    }

    row.height = 24;
    currentRowIndex++;
  }

  // --- SUMMARY / TOTALS FOOTER ROW ---
  const totalRowIndex = currentRowIndex;
  const totalRow = worksheet.getRow(totalRowIndex);

  worksheet.mergeCells(`A${totalRowIndex}:H${totalRowIndex}`);
  const summaryLabel = totalRow.getCell(1);
  summaryLabel.value = `TOTAL GENERAL (${totalOrdersCount} PEDIDOS CONSOLIDADOS)`;
  summaryLabel.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  summaryLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  // Totals Formulas
  const startRow = 9;
  const endRow = totalRowIndex - 1;

  if (rows.length > 0) {
    totalRow.getCell(9).value = { formula: `SUM(I${startRow}:I${endRow})` };
    totalRow.getCell(10).value = { formula: `SUM(J${startRow}:J${endRow})` };
    totalRow.getCell(11).value = { formula: `SUM(K${startRow}:K${endRow})` };
  } else {
    totalRow.getCell(9).value = 0;
    totalRow.getCell(10).value = 0;
    totalRow.getCell(11).value = 0;
  }

  totalRow.getCell(9).numFmt = '"$"#,##0';
  totalRow.getCell(10).numFmt = '"$"#,##0';
  totalRow.getCell(11).numFmt = '"$"#,##0';

  totalRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.getCell(9).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: DARK_TEXT } };
  totalRow.getCell(10).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: DARK_TEXT } };
  totalRow.getCell(11).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: BRAND_DEEP_GREEN } };

  for (let c = 1; c <= 15; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_LIGHT_GREEN },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: BRAND_DEEP_GREEN } },
      bottom: { style: 'double', color: { argb: BRAND_DEEP_GREEN } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  }
  totalRow.height = 26;

  // --- AUTO-ADJUST COLUMN WIDTHS ---
  const defaultWidths = [
    16, // 1: N° Pedido
    18, // 2: Fecha y Hora
    22, // 3: Sede
    24, // 4: Cliente
    16, // 5: Teléfono
    18, // 6: Tipo Entrega
    30, // 7: Dirección
    16, // 8: Método Pago
    16, // 9: Subtotal
    18, // 10: Domicilio
    18, // 11: Total
    16, // 12: Estado
    20, // 13: Aprobado Por
    20, // 14: Preparado Por
    40, // 15: Detalle Productos
  ];

  defaultWidths.forEach((width, idx) => {
    const col = worksheet.getColumn(idx + 1);
    col.width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

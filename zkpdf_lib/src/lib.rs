//! `zkpdf_lib` — ZK-verifiable PDF claim library.
//!
//! Provides [`PDFCircuitInput`] and [`verify_pdf_claim`] for asserting that a
//! PDF document contains a given substring at a specific byte offset. This is
//! the circuit-side data model used by the ZK proof pipeline: the prover
//! supplies a [`PDFCircuitInput`], the library validates the claim against the
//! raw PDF bytes, and the result can be used as a public input to a ZK circuit.
//!
//! # Example
//!
//! ```rust
//! use zkpdf_lib::{verify_pdf_claim, PDFCircuitInput};
//!
//! // Minimal synthetic PDF header followed by content
//! let mut pdf_data = b"%PDF-1.4\n".to_vec();
//! let offset = pdf_data.len();
//! pdf_data.extend_from_slice(b"Important Document");
//!
//! let input = PDFCircuitInput {
//!     pdf_bytes: pdf_data,
//!     page_number: 0,
//!     offset,
//!     substring: "Important Document".to_string(),
//! };
//!
//! let result = verify_pdf_claim(input).unwrap();
//! assert!(result);
//! ```

use std::fmt;

/// Input supplied to the PDF verification circuit.
///
/// `pdf_bytes` is the raw content of the PDF file.  
/// `page_number` is the zero-based page index the claim is associated with.  
/// `offset` is the byte offset within `pdf_bytes` where `substring` must appear.  
/// `substring` is the exact UTF-8 string that must be present at `offset`.
#[derive(Debug, Clone)]
pub struct PDFCircuitInput {
    /// Raw bytes of the PDF document.
    pub pdf_bytes: Vec<u8>,
    /// Zero-based page number the claimed substring belongs to.
    ///
    /// Stored as a public circuit input for future page-aware PDF parsing.
    /// The current implementation validates the byte-level claim against the
    /// full document; page-scoped verification will be added once a PDF page
    /// boundary parser is integrated.
    pub page_number: u32,
    /// Byte offset within `pdf_bytes` at which `substring` must start.
    pub offset: usize,
    /// The exact substring that must appear at `offset`.
    pub substring: String,
}

/// Errors returned by [`verify_pdf_claim`].
#[derive(Debug, PartialEq)]
pub enum ZkPdfError {
    /// The supplied bytes do not constitute a valid PDF document.
    InvalidPdf(String),
    /// The claim could not be verified (substring not found at the given offset).
    ClaimFailed(String),
}

impl fmt::Display for ZkPdfError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ZkPdfError::InvalidPdf(msg) => write!(f, "Invalid PDF: {}", msg),
            ZkPdfError::ClaimFailed(msg) => write!(f, "Claim failed: {}", msg),
        }
    }
}

impl std::error::Error for ZkPdfError {}

/// Verify that `input.pdf_bytes` contains `input.substring` at byte offset
/// `input.offset`.
///
/// # Errors
///
/// Returns [`ZkPdfError::InvalidPdf`] when the supplied bytes lack the `%PDF`
/// header required by the PDF specification.
///
/// Returns [`ZkPdfError::ClaimFailed`] when the substring is not present at the
/// stated offset (including when the offset + substring length would exceed the
/// length of the document).
pub fn verify_pdf_claim(input: PDFCircuitInput) -> Result<bool, ZkPdfError> {
    let pdf = &input.pdf_bytes;

    // Basic PDF magic-number validation (ISO 32000-1 §7.5.2).
    if pdf.len() < 4 || &pdf[..4] != b"%PDF" {
        return Err(ZkPdfError::InvalidPdf(
            "missing %PDF header".to_string(),
        ));
    }

    let sub_bytes = input.substring.as_bytes();
    let end = input
        .offset
        .checked_add(sub_bytes.len())
        .ok_or_else(|| {
            ZkPdfError::ClaimFailed("offset + substring length overflows usize".to_string())
        })?;

    if end > pdf.len() {
        return Err(ZkPdfError::ClaimFailed(format!(
            "offset {} + substring length {} ({}) exceeds PDF size {}",
            input.offset,
            sub_bytes.len(),
            end,
            pdf.len()
        )));
    }

    if &pdf[input.offset..end] == sub_bytes {
        Ok(true)
    } else {
        Err(ZkPdfError::ClaimFailed(format!(
            "substring not found at offset {}",
            input.offset
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_pdf(extra: &[u8]) -> Vec<u8> {
        let mut v = b"%PDF-1.4\n".to_vec();
        v.extend_from_slice(extra);
        v
    }

    #[test]
    fn valid_claim_at_known_offset() {
        let prefix = b"%PDF-1.4\n";
        let mut pdf = prefix.to_vec();
        let offset = pdf.len();
        pdf.extend_from_slice(b"Important Document");

        let input = PDFCircuitInput {
            pdf_bytes: pdf,
            page_number: 0,
            offset,
            substring: "Important Document".to_string(),
        };

        assert_eq!(verify_pdf_claim(input).unwrap(), true);
    }

    #[test]
    fn invalid_pdf_header() {
        let input = PDFCircuitInput {
            pdf_bytes: b"This is not a PDF".to_vec(),
            page_number: 0,
            offset: 0,
            substring: "This".to_string(),
        };

        assert!(matches!(
            verify_pdf_claim(input),
            Err(ZkPdfError::InvalidPdf(_))
        ));
    }

    #[test]
    fn offset_out_of_bounds() {
        let pdf = make_pdf(b"short");

        let input = PDFCircuitInput {
            pdf_bytes: pdf,
            page_number: 0,
            offset: 9999,
            substring: "short".to_string(),
        };

        assert!(matches!(
            verify_pdf_claim(input),
            Err(ZkPdfError::ClaimFailed(_))
        ));
    }

    #[test]
    fn wrong_substring_at_offset() {
        let prefix = b"%PDF-1.4\n";
        let mut pdf = prefix.to_vec();
        let offset = pdf.len();
        pdf.extend_from_slice(b"Different Content");

        let input = PDFCircuitInput {
            pdf_bytes: pdf,
            page_number: 0,
            offset,
            substring: "Important Document".to_string(),
        };

        assert!(matches!(
            verify_pdf_claim(input),
            Err(ZkPdfError::ClaimFailed(_))
        ));
    }

    #[test]
    fn empty_pdf_returns_invalid() {
        let input = PDFCircuitInput {
            pdf_bytes: vec![],
            page_number: 0,
            offset: 0,
            substring: String::new(),
        };

        assert!(matches!(
            verify_pdf_claim(input),
            Err(ZkPdfError::InvalidPdf(_))
        ));
    }

    #[test]
    fn empty_substring_always_matches_at_valid_offset() {
        let pdf = make_pdf(b"some content");
        let offset = 0;

        let input = PDFCircuitInput {
            pdf_bytes: pdf,
            page_number: 1,
            offset,
            substring: String::new(),
        };

        assert_eq!(verify_pdf_claim(input).unwrap(), true);
    }

    #[test]
    fn substring_at_exact_end_of_pdf() {
        let suffix = b"Trailer";
        let mut pdf = make_pdf(b"body-content-");
        let offset = pdf.len();
        pdf.extend_from_slice(suffix);

        let input = PDFCircuitInput {
            pdf_bytes: pdf,
            page_number: 0,
            offset,
            substring: "Trailer".to_string(),
        };

        assert_eq!(verify_pdf_claim(input).unwrap(), true);
    }

    #[test]
    fn one_byte_past_end_fails() {
        let pdf = make_pdf(b"data");

        let input = PDFCircuitInput {
            pdf_bytes: pdf.clone(),
            page_number: 0,
            offset: pdf.len(), // pointing just past the last byte
            substring: "x".to_string(),
        };

        assert!(matches!(
            verify_pdf_claim(input),
            Err(ZkPdfError::ClaimFailed(_))
        ));
    }
}

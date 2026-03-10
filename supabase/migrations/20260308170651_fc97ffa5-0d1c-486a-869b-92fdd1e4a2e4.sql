
CREATE POLICY "Loan officers insert assigned repayments"
ON public.loan_repayments
FOR INSERT
TO authenticated
WITH CHECK (is_loan_officer_for(loan_id));

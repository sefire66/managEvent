import React from "react";
import styled from "styled-components";
import type { InputBoxProps } from "../../types/types";

const InputBox1 = ({
  name,
  titleName,
  value,
  onChange,
  placeholder,
  type = "text",
  readOnly,
  required = false,
  showError = false,
  min,
  max,
  step,
  dir,
  autoComplete,
}: InputBoxProps) => {
  const id = name; // לקשור label ל-input

  return (
    <StyledWrapper>
      <div className="coolinput">
        <label htmlFor={id} className="text">
          {titleName}
        </label>

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          readOnly={!!readOnly}
          required={!!required}
          min={min}
          max={max}
          step={step}
          dir={dir}
          autoComplete={autoComplete}
          aria-invalid={showError ? "true" : "false"}
          className={`input ${showError ? "error" : ""}`}
        />

        {showError && <div className="error-message">*שדה נדרש</div>}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  margin-bottom: 1px;

  .coolinput {
    display: flex;
    flex-direction: column;
    position: static;
    width: 100%;
    max-width: 100%;
    min-width: 100px;
    margin: 0;
  }

  .coolinput label.text {
    font-size: 0.75rem;
    color: #818cf8;
    font-weight: 500;
    position: relative;
    top: 0.5rem;
    margin: 0 0 7px 7px;
    padding: 5px;
    background-color: transparent;
    width: fit-content;
  }

  .coolinput input.input {
    padding: 5px 10px;
    font-size: 0.6rem;
    border: 2px #818cf8 solid;
    border-radius: 5px;
    background-color: #f3f3f3;
  }

  .coolinput input.input:focus {
    outline: none;
  }

  .coolinput input.input.error/ {
    border-color: #f44336;
  }

  .coolinput .error-message {
    font-size: 0.6rem;
    color: #f44336;
    margin-top: 4px;
    text-align: right;
  }
`;

export default InputBox1;

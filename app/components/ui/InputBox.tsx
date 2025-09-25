import React from "react";
import styled from "styled-components";
import type { InputBoxProps } from "../../types/types";

const InputBox = ({
  name,
  titleName,
  value,
  onChange,
  type = "text",
}: InputBoxProps) => {
  return (
    <StyledWrapper>
      <div className="inputbox">
        <input
          name={name}
          type={type}
          required={true}
          value={value}
          onChange={onChange}
        />
        <span>{titleName}</span>
        <i />
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  max-width: 300px;

  .inputbox {
    position: relative;
    width: 100%;
  }

  .inputbox input {
    position: relative;
    width: 100%;
    padding: 20px 10px 10px;
    background: transparent;
    outline: none;
    box-shadow: none;
    border: none;
    color: #23242a;
    font-size: 1em;
    letter-spacing: 0.05em;
    transition: 0.5s;
    z-index: 10;
  }

  .inputbox span {
    position: absolute;
    right: 0;
    padding: 20px 0px 10px;
    font-size: 1em;
    color: #8f8f8f;
    letter-spacing: 0.05em;
    transition: 0.5s;
    pointer-events: none;
  }

  .inputbox input:valid ~ span,
  .inputbox input:focus ~ span {
    color: #5748f2;
    transform: translateX(-10px) translateY(-34px);
    font-size: 0.75em;
  }

  .inputbox i {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 2px;
    background: #5748f2;
    border-radius: 4px;
    transition: 0.5s;
    pointer-events: none;
    z-index: 9;
  }

  .inputbox input:valid ~ i,
  .inputbox input:focus ~ i {
    height: 44px;
  }
`;

export default InputBox;

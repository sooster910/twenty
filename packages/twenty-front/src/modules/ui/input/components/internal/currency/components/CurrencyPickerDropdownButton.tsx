import { useEffect, useState } from 'react';
import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';

import { CurrencyCode } from '@/object-record/record-field/types/CurrencyCode';
import { IconChevronDown } from '@/ui/display/icon';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useDropdown } from '@/ui/layout/dropdown/hooks/useDropdown';
import { isNonNullable } from '~/utils/isNonNullable';

import { CurrencyPickerHotkeyScope } from '../types/CurrencyPickerHotkeyScope';

import { CurrencyPickerDropdownSelect } from './CurrencyPickerDropdownSelect';

type StyledDropdownButtonProps = {
  isUnfolded: boolean;
};

export const StyledDropdownButtonContainer = styled.div<StyledDropdownButtonProps>`
  align-items: center;
  color: ${({ color }) => color ?? 'none'};
  cursor: pointer;
  display: flex;
  border-right: ${({ theme }) => `1px solid ${theme.border.color.medium}`};
  height: 32px;
  padding-left: ${({ theme }) => theme.spacing(2)};
  padding-right: ${({ theme }) => theme.spacing(2)};
  user-select: none;
  &:hover {
    filter: brightness(0.95);
  }
`;

const StyledIconContainer = styled.div`
  align-items: center;
  color: ${({ theme }) => theme.font.color.tertiary};
  display: flex;
  gap: ${({ theme }) => theme.spacing(1)};
  font-weight: ${({ theme }) => theme.font.weight.medium};
  justify-content: center;

  svg {
    align-items: center;
    display: flex;
    height: 16px;
    justify-content: center;
  }
`;

export type Currency = {
  label: string;
  value: string;
  Icon: any;
};

export const CurrencyPickerDropdownButton = ({
  valueCode,
  onChange,
  currencies,
}: {
  valueCode: string;
  onChange: (currency: Currency) => void;
  currencies: Currency[];
}) => {
  const theme = useTheme();

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>();

  const { isDropdownOpen, closeDropdown } = useDropdown(
    CurrencyPickerHotkeyScope.CurrencyPicker,
  );

  const handleChange = (currency: Currency) => {
    onChange(currency);
    closeDropdown();
  };

  useEffect(() => {
    const currency = currencies.find(({ value }) => value === valueCode);
    if (isNonNullable(currency)) {
      setSelectedCurrency(currency);
    }
  }, [valueCode, currencies]);

  return (
    <Dropdown
      dropdownMenuWidth={200}
      dropdownId="currncy-picker-dropdown-id"
      dropdownHotkeyScope={{ scope: CurrencyPickerHotkeyScope.CurrencyPicker }}
      clickableComponent={
        <StyledDropdownButtonContainer isUnfolded={isDropdownOpen}>
          <StyledIconContainer>
            {selectedCurrency ? selectedCurrency.value : CurrencyCode.USD}
            <IconChevronDown size={theme.icon.size.sm} />
          </StyledIconContainer>
        </StyledDropdownButtonContainer>
      }
      dropdownComponents={
        <CurrencyPickerDropdownSelect
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onChange={handleChange}
        />
      }
      dropdownPlacement="bottom-start"
      dropdownOffset={{ x: 0, y: 4 }}
    />
  );
};

/**
 * CountrySelect Component
 * 
 * Searchable dropdown for selecting a country.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CountrySelectProps, CountryOption } from '../types';

// Comprehensive country list with approximate centers
const ALL_COUNTRIES: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan', center: [67.7, 33.9] },
  { code: 'AL', name: 'Albania', center: [20.2, 41.2] },
  { code: 'DZ', name: 'Algeria', center: [3.0, 28.0] },
  { code: 'AD', name: 'Andorra', center: [1.6, 42.5] },
  { code: 'AO', name: 'Angola', center: [17.9, -11.2] },
  { code: 'AG', name: 'Antigua and Barbuda', center: [-61.8, 17.1] },
  { code: 'AR', name: 'Argentina', center: [-63.6, -38.4] },
  { code: 'AM', name: 'Armenia', center: [45.0, 40.1] },
  { code: 'AU', name: 'Australia', center: [133.8, -25.3] },
  { code: 'AT', name: 'Austria', center: [14.6, 47.5] },
  { code: 'AZ', name: 'Azerbaijan', center: [47.6, 40.1] },
  { code: 'BS', name: 'Bahamas', center: [-77.4, 25.0] },
  { code: 'BH', name: 'Bahrain', center: [50.6, 26.0] },
  { code: 'BD', name: 'Bangladesh', center: [90.4, 23.7] },
  { code: 'BB', name: 'Barbados', center: [-59.5, 13.2] },
  { code: 'BY', name: 'Belarus', center: [27.9, 53.7] },
  { code: 'BE', name: 'Belgium', center: [4.5, 50.5] },
  { code: 'BZ', name: 'Belize', center: [-88.5, 17.2] },
  { code: 'BJ', name: 'Benin', center: [2.3, 9.3] },
  { code: 'BT', name: 'Bhutan', center: [90.4, 27.5] },
  { code: 'BO', name: 'Bolivia', center: [-63.6, -16.3] },
  { code: 'BA', name: 'Bosnia and Herzegovina', center: [17.7, 43.9] },
  { code: 'BW', name: 'Botswana', center: [24.7, -22.3] },
  { code: 'BR', name: 'Brazil', center: [-51.9, -14.2] },
  { code: 'BN', name: 'Brunei', center: [114.7, 4.5] },
  { code: 'BG', name: 'Bulgaria', center: [25.5, 42.7] },
  { code: 'BF', name: 'Burkina Faso', center: [-1.6, 12.2] },
  { code: 'BI', name: 'Burundi', center: [29.9, -3.4] },
  { code: 'KH', name: 'Cambodia', center: [105.0, 12.6] },
  { code: 'CM', name: 'Cameroon', center: [12.4, 7.4] },
  { code: 'CA', name: 'Canada', center: [-106.3, 56.1] },
  { code: 'CV', name: 'Cape Verde', center: [-24.0, 16.0] },
  { code: 'CF', name: 'Central African Republic', center: [21.0, 6.6] },
  { code: 'TD', name: 'Chad', center: [18.7, 15.5] },
  { code: 'CL', name: 'Chile', center: [-71.5, -35.7] },
  { code: 'CN', name: 'China', center: [104.2, 35.9] },
  { code: 'CO', name: 'Colombia', center: [-74.3, 4.6] },
  { code: 'KM', name: 'Comoros', center: [43.9, -11.9] },
  { code: 'CG', name: 'Congo', center: [15.8, -0.2] },
  { code: 'CD', name: 'Democratic Republic of the Congo', center: [21.8, -4.0] },
  { code: 'CR', name: 'Costa Rica', center: [-83.8, 9.7] },
  { code: 'CI', name: "Côte d'Ivoire", center: [-5.5, 7.5] },
  { code: 'HR', name: 'Croatia', center: [15.2, 45.1] },
  { code: 'CU', name: 'Cuba', center: [-77.8, 21.5] },
  { code: 'CY', name: 'Cyprus', center: [33.4, 35.1] },
  { code: 'CZ', name: 'Czech Republic', center: [15.5, 49.8] },
  { code: 'DK', name: 'Denmark', center: [9.5, 56.3] },
  { code: 'DJ', name: 'Djibouti', center: [42.6, 11.8] },
  { code: 'DM', name: 'Dominica', center: [-61.4, 15.4] },
  { code: 'DO', name: 'Dominican Republic', center: [-70.2, 18.7] },
  { code: 'EC', name: 'Ecuador', center: [-78.2, -1.8] },
  { code: 'EG', name: 'Egypt', center: [30.8, 26.8] },
  { code: 'SV', name: 'El Salvador', center: [-88.9, 13.8] },
  { code: 'GQ', name: 'Equatorial Guinea', center: [10.3, 1.7] },
  { code: 'ER', name: 'Eritrea', center: [39.8, 15.2] },
  { code: 'EE', name: 'Estonia', center: [25.0, 58.6] },
  { code: 'SZ', name: 'Eswatini', center: [31.5, -26.5] },
  { code: 'ET', name: 'Ethiopia', center: [40.5, 9.1] },
  { code: 'FJ', name: 'Fiji', center: [178.0, -18.0] },
  { code: 'FI', name: 'Finland', center: [25.7, 61.9] },
  { code: 'FR', name: 'France', center: [2.2, 46.2] },
  { code: 'GA', name: 'Gabon', center: [11.6, -0.8] },
  { code: 'GM', name: 'Gambia', center: [-15.3, 13.4] },
  { code: 'GE', name: 'Georgia', center: [43.4, 42.3] },
  { code: 'DE', name: 'Germany', center: [10.4, 51.2] },
  { code: 'GH', name: 'Ghana', center: [-1.0, 7.9] },
  { code: 'GR', name: 'Greece', center: [21.8, 39.1] },
  { code: 'GD', name: 'Grenada', center: [-61.7, 12.1] },
  { code: 'GT', name: 'Guatemala', center: [-90.2, 15.8] },
  { code: 'GN', name: 'Guinea', center: [-9.7, 9.9] },
  { code: 'GW', name: 'Guinea-Bissau', center: [-15.2, 12.0] },
  { code: 'GY', name: 'Guyana', center: [-58.9, 5.0] },
  { code: 'HT', name: 'Haiti', center: [-72.3, 19.0] },
  { code: 'HN', name: 'Honduras', center: [-86.2, 15.2] },
  { code: 'HU', name: 'Hungary', center: [19.5, 47.2] },
  { code: 'IS', name: 'Iceland', center: [-19.0, 65.0] },
  { code: 'IN', name: 'India', center: [78.9, 21.0] },
  { code: 'ID', name: 'Indonesia', center: [113.9, -0.8] },
  { code: 'IR', name: 'Iran', center: [53.7, 32.4] },
  { code: 'IQ', name: 'Iraq', center: [43.7, 33.2] },
  { code: 'IE', name: 'Ireland', center: [-8.2, 53.4] },
  { code: 'IL', name: 'Israel', center: [34.9, 31.0] },
  { code: 'IT', name: 'Italy', center: [12.6, 42.5] },
  { code: 'JM', name: 'Jamaica', center: [-77.3, 18.1] },
  { code: 'JP', name: 'Japan', center: [138.3, 36.2] },
  { code: 'JO', name: 'Jordan', center: [36.2, 30.6] },
  { code: 'KZ', name: 'Kazakhstan', center: [66.9, 48.0] },
  { code: 'KE', name: 'Kenya', center: [38.0, -0.0] },
  { code: 'KI', name: 'Kiribati', center: [-168.7, 1.9] },
  { code: 'KP', name: 'North Korea', center: [127.5, 40.3] },
  { code: 'KR', name: 'South Korea', center: [127.8, 36.0] },
  { code: 'KW', name: 'Kuwait', center: [47.5, 29.3] },
  { code: 'KG', name: 'Kyrgyzstan', center: [74.8, 41.2] },
  { code: 'LA', name: 'Laos', center: [102.5, 19.9] },
  { code: 'LV', name: 'Latvia', center: [24.6, 56.9] },
  { code: 'LB', name: 'Lebanon', center: [35.9, 33.9] },
  { code: 'LS', name: 'Lesotho', center: [28.2, -29.6] },
  { code: 'LR', name: 'Liberia', center: [-9.4, 6.4] },
  { code: 'LY', name: 'Libya', center: [17.2, 26.3] },
  { code: 'LI', name: 'Liechtenstein', center: [9.6, 47.2] },
  { code: 'LT', name: 'Lithuania', center: [23.9, 55.2] },
  { code: 'LU', name: 'Luxembourg', center: [6.1, 49.8] },
  { code: 'MG', name: 'Madagascar', center: [46.9, -18.8] },
  { code: 'MW', name: 'Malawi', center: [34.3, -13.3] },
  { code: 'MY', name: 'Malaysia', center: [101.9, 4.2] },
  { code: 'MV', name: 'Maldives', center: [73.2, 3.2] },
  { code: 'ML', name: 'Mali', center: [-4.0, 17.6] },
  { code: 'MT', name: 'Malta', center: [14.4, 35.9] },
  { code: 'MH', name: 'Marshall Islands', center: [171.2, 7.1] },
  { code: 'MR', name: 'Mauritania', center: [-10.9, 21.0] },
  { code: 'MU', name: 'Mauritius', center: [57.6, -20.3] },
  { code: 'MX', name: 'Mexico', center: [-102.6, 23.6] },
  { code: 'FM', name: 'Micronesia', center: [150.6, 7.4] },
  { code: 'MD', name: 'Moldova', center: [28.4, 47.4] },
  { code: 'MC', name: 'Monaco', center: [7.4, 43.7] },
  { code: 'MN', name: 'Mongolia', center: [103.8, 46.9] },
  { code: 'ME', name: 'Montenegro', center: [19.4, 42.7] },
  { code: 'MA', name: 'Morocco', center: [-7.1, 31.8] },
  { code: 'MZ', name: 'Mozambique', center: [35.5, -18.7] },
  { code: 'MM', name: 'Myanmar', center: [96.0, 19.0] },
  { code: 'NA', name: 'Namibia', center: [18.5, -22.0] },
  { code: 'NR', name: 'Nauru', center: [166.9, -0.5] },
  { code: 'NP', name: 'Nepal', center: [84.1, 28.4] },
  { code: 'NL', name: 'Netherlands', center: [5.3, 52.1] },
  { code: 'NZ', name: 'New Zealand', center: [174.9, -40.9] },
  { code: 'NI', name: 'Nicaragua', center: [-85.2, 13.1] },
  { code: 'NE', name: 'Niger', center: [8.1, 17.6] },
  { code: 'NG', name: 'Nigeria', center: [8.7, 9.1] },
  { code: 'MK', name: 'North Macedonia', center: [21.7, 41.5] },
  { code: 'NO', name: 'Norway', center: [8.5, 60.5] },
  { code: 'OM', name: 'Oman', center: [55.9, 21.5] },
  { code: 'PK', name: 'Pakistan', center: [69.3, 30.4] },
  { code: 'PW', name: 'Palau', center: [134.6, 7.5] },
  { code: 'PA', name: 'Panama', center: [-80.8, 8.4] },
  { code: 'PG', name: 'Papua New Guinea', center: [143.9, -6.3] },
  { code: 'PY', name: 'Paraguay', center: [-58.4, -23.4] },
  { code: 'PE', name: 'Peru', center: [-77.0, -9.2] },
  { code: 'PH', name: 'Philippines', center: [121.8, 12.9] },
  { code: 'PL', name: 'Poland', center: [19.1, 52.0] },
  { code: 'PT', name: 'Portugal', center: [-8.2, 39.4] },
  { code: 'QA', name: 'Qatar', center: [51.2, 25.4] },
  { code: 'RO', name: 'Romania', center: [25.0, 46.0] },
  { code: 'RU', name: 'Russia', center: [105.3, 61.5] },
  { code: 'RW', name: 'Rwanda', center: [29.9, -1.9] },
  { code: 'KN', name: 'Saint Kitts and Nevis', center: [-62.8, 17.4] },
  { code: 'LC', name: 'Saint Lucia', center: [-61.0, 13.9] },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', center: [-61.2, 13.2] },
  { code: 'WS', name: 'Samoa', center: [-172.1, -13.8] },
  { code: 'SM', name: 'San Marino', center: [12.5, 43.9] },
  { code: 'ST', name: 'São Tomé and Príncipe', center: [6.6, 0.2] },
  { code: 'SA', name: 'Saudi Arabia', center: [45.1, 23.9] },
  { code: 'SN', name: 'Senegal', center: [-14.5, 14.5] },
  { code: 'RS', name: 'Serbia', center: [21.0, 44.0] },
  { code: 'SC', name: 'Seychelles', center: [55.5, -4.7] },
  { code: 'SL', name: 'Sierra Leone', center: [-11.8, 8.5] },
  { code: 'SG', name: 'Singapore', center: [103.8, 1.4] },
  { code: 'SK', name: 'Slovakia', center: [19.7, 48.7] },
  { code: 'SI', name: 'Slovenia', center: [15.0, 46.2] },
  { code: 'SB', name: 'Solomon Islands', center: [160.2, -9.6] },
  { code: 'SO', name: 'Somalia', center: [46.2, 5.2] },
  { code: 'ZA', name: 'South Africa', center: [22.9, -30.6] },
  { code: 'SS', name: 'South Sudan', center: [31.3, 6.9] },
  { code: 'ES', name: 'Spain', center: [-3.7, 40.5] },
  { code: 'LK', name: 'Sri Lanka', center: [80.8, 7.9] },
  { code: 'SD', name: 'Sudan', center: [30.2, 12.9] },
  { code: 'SR', name: 'Suriname', center: [-56.0, 4.0] },
  { code: 'SE', name: 'Sweden', center: [18.6, 60.1] },
  { code: 'CH', name: 'Switzerland', center: [8.2, 46.8] },
  { code: 'SY', name: 'Syria', center: [38.9, 34.8] },
  { code: 'TW', name: 'Taiwan', center: [121.0, 23.7] },
  { code: 'TJ', name: 'Tajikistan', center: [71.3, 38.9] },
  { code: 'TZ', name: 'Tanzania', center: [34.9, -6.4] },
  { code: 'TH', name: 'Thailand', center: [100.5, 15.9] },
  { code: 'TL', name: 'Timor-Leste', center: [125.7, -8.9] },
  { code: 'TG', name: 'Togo', center: [0.8, 8.6] },
  { code: 'TO', name: 'Tonga', center: [-175.2, -21.2] },
  { code: 'TT', name: 'Trinidad and Tobago', center: [-61.2, 10.7] },
  { code: 'TN', name: 'Tunisia', center: [9.5, 33.9] },
  { code: 'TR', name: 'Turkey', center: [35.2, 38.9] },
  { code: 'TM', name: 'Turkmenistan', center: [59.6, 38.9] },
  { code: 'TV', name: 'Tuvalu', center: [177.6, -7.1] },
  { code: 'UG', name: 'Uganda', center: [32.3, 1.4] },
  { code: 'UA', name: 'Ukraine', center: [31.2, 48.4] },
  { code: 'AE', name: 'United Arab Emirates', center: [53.8, 23.4] },
  { code: 'GB', name: 'United Kingdom', center: [-2.0, 54.0] },
  { code: 'US', name: 'United States', center: [-98.5, 39.8] },
  { code: 'UY', name: 'Uruguay', center: [-55.8, -32.5] },
  { code: 'UZ', name: 'Uzbekistan', center: [64.6, 41.4] },
  { code: 'VU', name: 'Vanuatu', center: [166.9, -15.4] },
  { code: 'VA', name: 'Vatican City', center: [12.5, 41.9] },
  { code: 'VE', name: 'Venezuela', center: [-66.6, 6.4] },
  { code: 'VN', name: 'Vietnam', center: [108.3, 14.1] },
  { code: 'YE', name: 'Yemen', center: [48.5, 15.6] },
  { code: 'ZM', name: 'Zambia', center: [27.8, -13.1] },
  { code: 'ZW', name: 'Zimbabwe', center: [29.2, -19.0] },
].sort((a, b) => a.name.localeCompare(b.name));


export const CountrySelect: React.FC<CountrySelectProps> = ({
  selectedCountry,
  onSelect,
  theme = 'matrix',
  placeholder = 'Search countries...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!search.trim()) return ALL_COUNTRIES.slice(0, 50); // Limit initial display
    
    const searchLower = search.toLowerCase();
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(searchLower) || 
           c.code.toLowerCase().includes(searchLower)
    ).slice(0, 50);
  }, [search]);

  // Get selected country name
  const selectedName = useMemo(() => {
    if (!selectedCountry) return '';
    const country = ALL_COUNTRIES.find(c => c.code === selectedCountry);
    return country?.name || selectedCountry;
  }, [selectedCountry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && filteredCountries.length > 0) {
      onSelect(filteredCountries[0]);
      setIsOpen(false);
      setSearch('');
    }
  };

  // Handle country selection
  const handleSelect = (country: CountryOption) => {
    onSelect(country);
    setIsOpen(false);
    setSearch('');
  };

  // Theme-specific styles
  const containerClasses = theme === 'matrix'
    ? 'relative w-64'
    : 'relative w-64';

  const inputClasses = theme === 'matrix'
    ? 'w-full px-3 py-2 bg-gray-900 border border-green-500/30 rounded text-green-400 placeholder-green-700 focus:outline-none focus:border-green-500 text-sm'
    : 'w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-sm';

  const dropdownClasses = theme === 'matrix'
    ? 'absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-900 border border-green-500/30 rounded shadow-lg z-50'
    : 'absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-50';

  const itemClasses = (isSelected: boolean) => theme === 'matrix'
    ? `px-3 py-2 cursor-pointer text-sm ${isSelected ? 'bg-green-900/50 text-green-300' : 'text-green-400 hover:bg-green-900/30'}`
    : `px-3 py-2 cursor-pointer text-sm ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`;

  const badgeClasses = theme === 'matrix'
    ? 'ml-2 px-1.5 py-0.5 text-xs bg-green-900/50 text-green-500 rounded'
    : 'ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded';

  return (
    <div ref={containerRef} className={containerClasses}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedCountry ? selectedName : '')}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputClasses}
        />
        
        {/* Dropdown arrow */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 ${
            theme === 'matrix' ? 'text-green-500' : 'text-gray-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className={dropdownClasses}>
          {filteredCountries.length === 0 ? (
            <div className={`px-3 py-2 text-sm ${theme === 'matrix' ? 'text-green-700' : 'text-gray-400'}`}>
              No countries found
            </div>
          ) : (
            filteredCountries.map((country) => (
              <div
                key={country.code}
                onClick={() => handleSelect(country)}
                className={itemClasses(country.code === selectedCountry)}
              >
                <span>{country.name}</span>
                <span className={badgeClasses}>{country.code}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelect;


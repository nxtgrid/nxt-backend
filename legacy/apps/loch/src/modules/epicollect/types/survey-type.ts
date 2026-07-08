export type Survey = {
  ec5_uuid: string
  community: string
  customer_id_type: string
  customer_id_number: string
  customer_full_name: string
  customer_gender: 'male' | 'female'
  has_phone: 'yes' | 'no'
  customer_phone: string
  connection_type: 'public' | 'hybrid' | 'commercial' | 'residential'
  full_service_yesno?: 'yes' | 'no' //full service needs to be optional because during single meter transition it could be undefined
  full_service_type?: string //full service type is optional because during single meter transition it could undefined
  meter_phase?: 'three_phase' | 'single_phase' //meter phase could be undefined during single meter transition (for old grids)
  gps_location: {
    latitude: string
    longitude: string
  }
  primary_residence: 'yes' | 'no'
  generator_owned: 'no' | 'yes_small' | 'yes_large'
  women_impacted: string
  are_bulbs_led: 'yes' | 'no',
  is_house_wired: 'yes' | 'no'
};

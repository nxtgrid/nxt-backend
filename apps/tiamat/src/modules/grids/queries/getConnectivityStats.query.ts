export function getConnectivityStats(): string {
  return `
      with table1 as (
        select grid_id, count(*) as total_meters
        from meters
        left join connections on connections.id = meters.connection_id
        left join customers on customers.id = connections.customer_id
        where customers.grid_id = $1
        group by customers.grid_id
      ), table2 as (
        select customers.grid_id, dcus.is_online, count(*) as online_group_count
        from meters
        left join dcus on dcus.id = meters.dcu_id
        left join connections on connections.id = meters.connection_id
        left join customers on customers.id = connections.customer_id
        where customers.grid_id = $2
        group by customers.grid_id, dcus.is_online
      )
      select table2.is_online, trunc(table2.online_group_count / table1.total_meters, 2) as percentage
      from table2
      left join table1 on table1.grid_id = table2.grid_id
    `;
}

import { useMemo } from "react";
import { List, ListItem } from "@/components/ui/data";
import { SectionHeader } from "@/components/ui/content";
import { UserItem } from "@/components/features/users";
import { useUserFiltering } from "@/components/features/users/hooks";
import { UserListProps, UserMeta } from "@/types/app";

export function UserList({
  users,
  selectedUser,
  onSelectUser,
  searchText,
  filteredEvents,
  theme = "matrix",
}: UserListProps) {
  const { filteredUsers } = useUserFiltering(users, searchText, filteredEvents);

  // Create list items for the common List component
  const listItems = useMemo((): ListItem<UserMeta>[] => {
    return filteredUsers.map(user => ({
      key: user.pubkey,
      data: user,
      isSectionHeader: false,
    }));
  }, [filteredUsers]);

  const renderUserItem = (user: UserMeta) => (
    <UserItem
      user={user}
      isSelected={selectedUser === user.pubkey}
      onSelectUser={onSelectUser}
      theme={theme}
    />
  );

  const renderUserSectionHeader = (title: string) => (
    <div className="px-2 py-1">
      <SectionHeader title={title} theme={theme} />
    </div>
  );

  return (
    <List
      items={listItems}
      renderItem={renderUserItem}
      renderSectionHeader={renderUserSectionHeader}
      headerTitle="USERS"
      theme={theme}
      emptyMessage={!searchText ? "select a channel to see users" : "no users found"}
      estimateItemSize={45}
      borderDirection="left"
    />
  );
}
